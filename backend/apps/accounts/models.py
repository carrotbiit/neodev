from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    # The main user model.

    # all of the following are additional parameters on top of the existing ones:

    # username: Required. 150 characters or fewer. Used for unique identification.
    #           Applicants who sign up on the site get their email as their username.
    # first_name: Optional (blank=True). Maximum 150 characters.
    # last_name: Optional (blank=True). Maximum 150 characters.
    # email: Optional (blank=True) by default, though often made mandatory in custom models.
    # password: Required string hash of the user's password.
    # is_staff: Boolean; determines if the user can access the Django admin site.
    # is_active: Boolean; recommended over deleting accounts to preserve data integrity.
    # is_superuser: Boolean; grants all permissions without explicitly assigning them.
    # last_login: Datetime of the user's last successful login.
    # date_joined: Datetime designating when the account was created.

    # vvV Custom fields Vvv

    bio = models.TextField(max_length=500, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # School grade, given at sign-up. Neodev is open to high school and below,
    # so 1-12. Null for accounts that aren't applicants (staff, superusers).
    grade = models.PositiveSmallIntegerField(null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
