import types
from django.contrib import admin
from django.urls import path
from django.utils.html import format_html
from django.template.response import TemplateResponse

from apps.neodev.models import EntryForm


# Admin site customization
admin.site.site_header = "Neodev Administration"
admin.site.site_title = "Neodev Admin Portal"
admin.site.index_title = "Welcome to the Neodev Dashboard"

def neodev_dashboard_view(self, request):
    context = dict(
        self.each_context(request),
        title="NeoDev Control Center",
    )
    return TemplateResponse(request, "admin/neodev/dashboard.html", context)


original_get_urls = admin.site.get_urls
original_get_app_list = admin.site.get_app_list


def custom_neodev_get_urls(self):
    urls = original_get_urls()
    custom_urls = [
        path(
            'neodev/control-center/',
            self.admin_view(lambda req: neodev_dashboard_view(self, req)),
            name='neodev_control_center',
        ),
    ]
    return custom_urls + urls


def custom_neodev_get_app_list(self, request, app_label=None):
    app_list = original_get_app_list(request, app_label)

    if app_label is None:
        # Check if NeoDev already exists in app_list (from registered models)
        neodev_app = next((app for app in app_list if app['app_label'] == 'neodev'), None)
        dashboard_item = {
            'name': 'Control Center Dashboard',
            'object_name': 'neodev_control_center',
            'admin_url': '/admin/neodev/control-center/',
            'view_only': True,
            'perms': {'view': True},
        }
        if neodev_app:
            neodev_app['models'].insert(0, dashboard_item)
        else:
            app_list.append({
                'name': 'NeoDev',
                'app_label': 'neodev',
                'app_url': '#',
                'has_module_perms': True,
                'models': [dashboard_item],
            })

    return app_list


admin.site.get_urls = types.MethodType(custom_neodev_get_urls, admin.site)
admin.site.get_app_list = types.MethodType(custom_neodev_get_app_list, admin.site)



# Models
@admin.register(EntryForm)
class EntryFormAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name', 'school', 'colored_status', 'submitted_at')
    list_display_links = ('user',)
    list_filter = ('status', 'submitted_at', 'timestamp')
    search_fields = ('user__username', 'user__email', 'first_name', 'last_name', 'school')
    autocomplete_fields = ('user',)
    readonly_fields = ('timestamp', 'updated_at', 'submitted_at', 'grade', 'first_name', 'last_name', 'school')
    
    # Form layout styling inside the entry detail view
    fieldsets = (
        ('Submission Info', {
            'fields': ('user', 'grade', 'timestamp', 'updated_at', 'submitted_at')
        }),
        ('Applicant', {
            'fields': ('first_name', 'last_name', 'school')
        }),
        ('Answers', {
            'fields': ('answer1', 'answer2', 'answer3', 'dietary_restrictions', 'other_needs')
        }),
        ('Review & Administration', {
            'fields': ('status', 'admin_comments'),
        }),
    )

    # 1. Adds pretty badge colors to the status column in the list view
    @admin.display(description='Status', ordering='status')
    def colored_status(self, obj):
        colors = {
            'Draft': '#adb5bd',
            'Unreviewed': '#6c757d',
            'Denied': '#dc3545',
            'Waitlist': '#ffc107',
            'Accepted': '#198754',
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 11px;">{}</span>',
            color, obj.status
        )

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