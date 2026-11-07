from rest_framework import serializers

from apps.neodev import models as neodev_models


class EntryForm(serializers.ModelSerializer):
    '''
    An applicant's own view of their application. Everything about where it
    stands — status, timestamps, admin comments — is read-only or absent: only
    staff move an application on, in the admin.
    '''

    class Meta:
        model = neodev_models.EntryForm
        fields = [
            'id',
            'first_name',
            'last_name',
            'school',
            'answer',
            'dietary_restrictions',
            'other_needs',
            'status',
            'timestamp',
            'updated_at',
            'submitted_at',
        ]
        read_only_fields = ['id', 'status', 'timestamp', 'updated_at', 'submitted_at']
