from django.db import models


class EntryForm(models.Model):
    '''
    One applicant's application. Created as a draft the first time they save,
    and locked once they submit it (status leaves DRAFT). Only staff move it
    on from there, in the admin.
    '''

    timestamp = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    user = models.OneToOneField(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='entry_form',
    )

    # Answers. Blank is allowed so a half-finished draft can be saved; the
    # submit endpoint is what insists on the required ones (see REQUIRED).
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    school = models.CharField(max_length=200, blank=True)
    answer = models.TextField(max_length=3000, blank=True)  # the application question
    dietary_restrictions = models.TextField(max_length=1000, blank=True)
    other_needs = models.TextField(max_length=1000, blank=True)

    admin_comments = models.TextField(default='', blank=True)

    class Statuses(models.TextChoices):
        DRAFT = 'Draft'
        UNREVIEWED = 'Unreviewed'
        DENIED = 'Denied'
        WAITLIST = 'Waitlist'
        ACCEPTED = 'Accepted'

    status = models.CharField(max_length=20, choices=Statuses.choices, default=Statuses.DRAFT)

    # Field -> message shown when it is empty on submit.
    REQUIRED = {
        'first_name': 'Enter your first name.',
        'last_name': 'Enter your last name.',
        'school': 'Enter your school.',
        'answer': 'Answer the application question.',
    }

    @property
    def is_editable(self):
        return self.status == self.Statuses.DRAFT

    def __str__(self):
        return f"Entry form - {self.user.username}"

    class Meta:
        app_label = 'neodev'
