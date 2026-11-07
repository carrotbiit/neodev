"""
Gives the entry form the sign-up page's fields.

The three generic questions are renamed, not dropped, so anything already
answered survives: question1 becomes the application question, question2 the
dietary restrictions, question3 other needs. Forms that existed before drafts
did were all submitted ones, so they are stamped as submitted at the time they
were created.
"""

import django.utils.timezone
from django.db import migrations, models


def stamp_existing_submissions(apps, schema_editor):
    EntryForm = apps.get_model('neodev', 'EntryForm')
    for form in EntryForm.objects.filter(submitted_at__isnull=True).exclude(status='Draft'):
        form.submitted_at = form.timestamp
        form.save(update_fields=['submitted_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('neodev', '0001_initial'),
    ]

    operations = [
        migrations.RenameField('entryform', 'question1', 'answer'),
        migrations.RenameField('entryform', 'question2', 'dietary_restrictions'),
        migrations.RenameField('entryform', 'question3', 'other_needs'),
        migrations.AlterField(
            model_name='entryform',
            name='answer',
            field=models.TextField(blank=True, max_length=3000),
        ),
        migrations.AlterField(
            model_name='entryform',
            name='dietary_restrictions',
            field=models.TextField(blank=True, max_length=1000),
        ),
        migrations.AlterField(
            model_name='entryform',
            name='other_needs',
            field=models.TextField(blank=True, max_length=1000),
        ),
        migrations.AddField(
            model_name='entryform',
            name='first_name',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='entryform',
            name='last_name',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='entryform',
            name='school',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='entryform',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='entryform',
            name='submitted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='entryform',
            name='admin_comments',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='entryform',
            name='status',
            field=models.CharField(
                choices=[
                    ('Draft', 'Draft'),
                    ('Unreviewed', 'Unreviewed'),
                    ('Denied', 'Denied'),
                    ('Waitlist', 'Waitlist'),
                    ('Accepted', 'Accepted'),
                ],
                default='Draft',
                max_length=20,
            ),
        ),
        migrations.RunPython(stamp_existing_submissions, migrations.RunPython.noop),
    ]
