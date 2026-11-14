from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import CustomUser


class UserRegistrationSerializer(serializers.ModelSerializer):
    '''
    Sign-up from the site. Applicants log in with their unique username.
    '''

    username = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    grade = serializers.IntegerField(
        min_value=1,
        max_value=12,
        error_messages={
            'min_value': 'Enter your grade as a number, like 9.',
            'max_value': 'Neodev is only open to students in high school and below.',
            'invalid': 'Enter your grade as a number, like 9.',
        },
    )
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    school = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name', 'school', 'grade']
        extra_kwargs = {'email': {'required': True, 'allow_blank': False}}

    def validate_username(self, value):
        value = value.strip()
        if CustomUser.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with that email already exists. Log in instead.')
        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': "The passwords don't match."})

        # The same rules as AUTH_PASSWORD_VALIDATORS, which create_user does not run.
        candidate = CustomUser(username=data.get('username'), email=data.get('email'))
        try:
            validate_password(data['password'], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': list(error.messages)})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        return CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            grade=validated_data.get('grade'),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            school=validated_data.get('school', ''),
        )


class UserProfileSerializer(serializers.ModelSerializer):
    # The user's application, or null before their first save. Read-only here;
    # it is written through /api/entry_form/mine/.
    entry_form = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'school', 'grade', 'date_joined', 'entry_form',
        ]
        read_only_fields = ['id', 'username', 'email', 'date_joined']

    def get_entry_form(self, user):
        # Imported here: neodev depends on accounts, not the other way round.
        from apps.neodev.models import EntryForm
        from apps.neodev.serializers import EntryForm as EntryFormSerializer

        try:
            return EntryFormSerializer(user.entry_form).data
        except EntryForm.DoesNotExist:
            return None