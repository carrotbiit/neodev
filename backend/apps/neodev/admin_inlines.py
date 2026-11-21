from django.contrib import admin
from nested_admin import NestedStackedInline

from apps.neodev.models import EntryForm


class EntryFormInline(NestedStackedInline):
    model = EntryForm
    can_delete = True
    extra = 0
    
    readonly_fields = ('timestamp', 'updated_at', 'submitted_at', 'grade', 'first_name', 'last_name', 'school')

    def get_fieldsets(self, request, obj=None):
        fieldsets = [
            ('Application Status & Info', {
                'fields': ('status', 'timestamp', 'submitted_at')
            }),
            ('Answers', {
                'fields': ('answer1', 'answer2', 'answer3', 'hackathons', 'dietary_restrictions', 'other_needs')
            }),
            ('Review & Administration', {
                'fields': ('admin_comments',),
            }),
        ]

        if 'accounts/customuser' not in request.path:
            fieldsets.insert(1, ('User Info', {
                'fields': ('full_name', 'school', 'grade')
            }))

        return fieldsets

    @admin.display(description='Name', ordering='last_name')
    def full_name(self, obj):
        return f'{obj.user.first_name} {obj.user.last_name}'.strip()

    @admin.display(description='First Name')
    def first_name(self, obj):
        return obj.user.first_name if obj.user else ''

    @admin.display(description='Last Name')
    def last_name(self, obj):
        return obj.user.last_name if obj.user else ''
    
    @admin.display(description='Grade')
    def grade(self, obj):
        return obj.user.grade if obj.user else ''

    @admin.display(description='School')
    def school(self, obj):
        return getattr(obj.user, 'school', '') if obj.user else ''