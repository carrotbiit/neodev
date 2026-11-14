from django.core.cache import cache
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import CustomUser
from apps.neodev.models import EntryForm

class Dashboard(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        """
        Returns aggregated telemetry metrics and recent EntryForm submissions
        for the organizer control center.

        Optional query params:
        - status: Filter submissions by EntryForm status (e.g., 'Unreviewed')
        - limit: Number of records to return (defaults to 25)
        """
        status_filter = request.query_params.get('status')
        try:
            limit = min(int(request.query_params.get('limit', 25)), 100)
        except ValueError:
            limit = 25

        # 1. Fetch or compute cached aggregate stats
        stats = cache.get('neodev_dashboard_stats')
        if stats is None:
            metrics = EntryForm.objects.aggregate(
                total_forms=Count('id'),
                drafts=Count('id', filter=Q(status=EntryForm.Statuses.DRAFT)),
                unreviewed=Count('id', filter=Q(status=EntryForm.Statuses.UNREVIEWED)),
                accepted=Count('id', filter=Q(status=EntryForm.Statuses.ACCEPTED)),
                waitlisted=Count('id', filter=Q(status=EntryForm.Statuses.WAITLIST)),
                denied=Count('id', filter=Q(status=EntryForm.Statuses.DENIED)),
            )

            stats = {
                "num_applicants": CustomUser.objects.filter(is_staff=False).count(),
                "total_forms": metrics['total_forms'],
                "drafts": metrics['drafts'],
                "unreviewed": metrics['unreviewed'],
                "accepted": metrics['accepted'],
                "waitlisted": metrics['waitlisted'],
                "denied": metrics['denied'],
            }
            cache.set('neodev_dashboard_stats', stats, 15)

        # 2. Query recent forms (optionally filtered by status)
        queryset = EntryForm.objects.select_related('user').order_by('-timestamp')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        submissions = [
            {
                "id": form.id,
                "first_name": form.first_name,
                "last_name": form.last_name,
                "email": form.user.email,
                "school": form.school or "Not specified",
                "status": form.status,
                "timestamp": form.timestamp.strftime("%b %d, %Y %H:%M") if form.timestamp else "N/A",
            }
            for form in queryset[:limit]
        ]

        return Response({
            "stats": stats,
            "submissions": submissions,
        })

    def post(self, request):
        """
        Allows quick status updates directly from the dashboard UI.

        Required request fields:
        - id: EntryForm primary key
        - status: New valid EntryForm status value
        """
        form_id = request.data.get('id')
        new_status = request.data.get('status')

        if not form_id or new_status not in EntryForm.Statuses.values:
            return Response(
                {"detail": "Valid 'id' and 'status' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        updated = EntryForm.objects.filter(id=form_id).update(status=new_status)
        if not updated:
            return Response(
                {"detail": "EntryForm not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Invalidate cached stats immediately so the UI reflects the change
        cache.delete('neodev_dashboard_stats')

        return Response({"id": form_id, "status": new_status})