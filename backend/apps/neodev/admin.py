from django.contrib import admin
from django.utils.html import format_html
from apps.neodev.models import EntryForm


# Admin site customization
admin.site.site_header = "Neodev Administration"
admin.site.site_title = "Neodev Admin Portal"
admin.site.index_title = "Welcome to the Neodev Dashboard"


# Models
@admin.register(EntryForm)
class EntryFormAdmin(admin.ModelAdmin):
    # Columns shown in the main table list view
    list_display = ('user', 'full_name', 'school', 'colored_status', 'submitted_at', 'short_answer')
    
    # Clickable fields to open the detail page
    list_display_links = ('user',)
    
    # Filter sidebar on the right side
    list_filter = ('status', 'submitted_at', 'timestamp')
    
    # Search bar targets username, email, and the answers given
    search_fields = ('user__username', 'user__email', 'first_name', 'last_name', 'school', 'answer')
    
    # Speeds up loading by using an autocomplete dropdown for users instead of a massive select menu
    autocomplete_fields = ('user',)
    
    # Read-only fields to prevent staff from altering timestamps
    readonly_fields = ('timestamp', 'updated_at', 'submitted_at', 'grade')
    
    # Form layout styling inside the entry detail view
    fieldsets = (
        ('Submission Info', {
            'fields': ('user', 'grade', 'timestamp', 'updated_at', 'submitted_at')
        }),
        ('Applicant', {
            'fields': ('first_name', 'last_name', 'school')
        }),
        ('Answers', {
            'fields': ('answer', 'dietary_restrictions', 'other_needs')
        }),
        ('Review & Administration', {
            'fields': ('status', 'admin_comments'),
            'classes': ('collapse-open',),  # Keeps this section visible by default
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

    # 2. Snippet limits so long text answers don't blow up the list table width
    @admin.display(description='Answer Preview')
    def short_answer(self, obj):
        return obj.answer[:50] + "..." if len(obj.answer) > 50 else obj.answer

    @admin.display(description='Name', ordering='last_name')
    def full_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'.strip()

    # The grade lives on the account (given at sign-up), shown here for review.
    @admin.display(description='Grade')
    def grade(self, obj):
        return obj.user.grade