from django.db import transaction
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.neodev import models as neodev_models
from apps.neodev import serializers as neodev_serializers


class EntryForm(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    '''
    The signed-in user's own application. Each user has at most one, so the
    sign-up page works through `mine` rather than ids:

        GET  /api/entry_form/mine/         -> the application, or 404 if none yet
        PUT  /api/entry_form/mine/         -> save a draft (creates it the first time)
        POST /api/entry_form/mine/submit/  -> save and submit; 400 if a required
                                              field is empty

    Both writes answer 409 once the application has been submitted. There is
    no create/update/delete by id: status and review belong to staff.
    '''

    permission_classes = [IsAuthenticated]
    serializer_class = neodev_serializers.EntryForm

    def get_queryset(self):
        return neodev_models.EntryForm.objects.filter(user=self.request.user)

    def _save_draft(self, request):
        '''Applies the request's answers to the user's form. Returns (form, error response).'''
        form = self.get_queryset().select_for_update().first()
        if form is not None and not form.is_editable:
            return None, Response(
                {'detail': 'This application has already been submitted.'},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = self.get_serializer(form, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return serializer.save(user=request.user), None

    @action(detail=False, methods=['get', 'put'])
    def mine(self, request):
        if request.method == 'GET':
            form = self.get_queryset().first()
            if form is None:
                return Response({'detail': 'No application yet.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(self.get_serializer(form).data)

        with transaction.atomic():
            form, error = self._save_draft(request)
        if error:
            return error
        return Response(self.get_serializer(form).data)

    @action(detail=False, methods=['post'], url_path='mine/submit')
    def submit(self, request):
        with transaction.atomic():
            form, error = self._save_draft(request)
            if error:
                return error

            missing = {
                field: [message]
                for field, message in neodev_models.EntryForm.REQUIRED.items()
                if not getattr(form, field).strip()
            }
            if missing:
                # Roll back is not needed: the answers are kept as a draft.
                return Response(missing, status=status.HTTP_400_BAD_REQUEST)

            form.status = neodev_models.EntryForm.Statuses.UNREVIEWED
            form.submitted_at = timezone.now()
            form.save(update_fields=['status', 'submitted_at', 'updated_at'])

        return Response(self.get_serializer(form).data)
