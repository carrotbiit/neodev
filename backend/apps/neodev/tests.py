'''
The sign-up page's whole conversation with the API: register, log in, read
the profile, save a draft, submit, and the refusals along the way.

The throttle middleware allows two requests a second per client by default,
which a test client exceeds immediately. Run with a higher limit:

    THROTTLE_MAX_QUEUE_LENGTH=1000 python manage.py test
'''

from rest_framework.test import APITestCase

from apps.accounts.models import CustomUser
from apps.neodev.models import EntryForm


PASSWORD = 'correct-horse-battery'


class SignupFlowTests(APITestCase):

    def register(self, email='Student@School.org', grade=10, **extra):
        body = {'email': email, 'password': PASSWORD, 'password_confirm': PASSWORD, 'grade': grade, **extra}
        return self.client.post('/api/auth/register/', body, format='json')

    def authorize(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    # ------------------------------------------------------------- accounts

    def test_register_returns_tokens_and_user(self):
        response = self.register()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        user = response.data['user']
        self.assertEqual(user['email'], 'student@school.org')  # normalised
        self.assertEqual(user['username'], 'student@school.org')
        self.assertEqual(user['grade'], 10)
        self.assertIsNone(user['entry_form'])

    def test_register_rejects_duplicate_email_case_insensitively(self):
        self.register()
        response = self.register(email='STUDENT@school.org')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)

    def test_register_rejects_grade_above_twelve(self):
        response = self.register(grade=13)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data['grade'][0]), 'Neodev is only open to students in high school and below.'
        )

    def test_register_runs_password_validators(self):
        body = {'email': 'a@b.org', 'password': 'password', 'password_confirm': 'password', 'grade': 9}
        response = self.client.post('/api/auth/register/', body, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)

    def test_register_rejects_mismatched_confirmation(self):
        body = {'email': 'a@b.org', 'password': PASSWORD, 'password_confirm': 'different-one', 'grade': 9}
        response = self.client.post('/api/auth/register/', body, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password_confirm', response.data)

    def test_login_with_email_as_username_then_me(self):
        self.register()
        response = self.client.post(
            '/api/auth/login/', {'username': 'student@school.org', 'password': PASSWORD}, format='json'
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.authorize(response.data['access'])
        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, 200, me.data)
        self.assertEqual(me.data['grade'], 10)

    def test_wrong_password_is_401(self):
        self.register()
        response = self.client.post(
            '/api/auth/login/', {'username': 'student@school.org', 'password': 'nope'}, format='json'
        )
        self.assertEqual(response.status_code, 401)

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_refresh_rotates_and_logout_blacklists(self):
        tokens = self.register().data
        refreshed = self.client.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn('refresh', refreshed.data)  # ROTATE_REFRESH_TOKENS

        logout = self.client.post('/api/auth/logout/', {'refresh': refreshed.data['refresh']}, format='json')
        self.assertEqual(logout.status_code, 200)
        again = self.client.post('/api/auth/refresh/', {'refresh': refreshed.data['refresh']}, format='json')
        self.assertEqual(again.status_code, 401)

    # ---------------------------------------------------------- application

    def test_application_draft_then_submit(self):
        self.authorize(self.register().data['access'])

        self.assertEqual(self.client.get('/api/entry_form/mine/').status_code, 404)

        draft = self.client.put('/api/entry_form/mine/', {'first_name': 'Ada'}, format='json')
        self.assertEqual(draft.status_code, 200, draft.data)
        self.assertEqual(draft.data['status'], 'Draft')
        self.assertEqual(self.client.get('/api/auth/me/').data['entry_form']['first_name'], 'Ada')

        incomplete = self.client.post('/api/entry_form/mine/submit/', {'last_name': 'L'}, format='json')
        self.assertEqual(incomplete.status_code, 400)
        self.assertEqual(set(incomplete.data), {'school', 'answer'})
        # What was sent is still kept as a draft.
        self.assertEqual(EntryForm.objects.get().last_name, 'L')

        done = self.client.post(
            '/api/entry_form/mine/submit/', {'school': 'Neo High', 'answer': 'A robot.'}, format='json'
        )
        self.assertEqual(done.status_code, 200, done.data)
        self.assertEqual(done.data['status'], 'Unreviewed')
        self.assertIsNotNone(done.data['submitted_at'])

        locked = self.client.put('/api/entry_form/mine/', {'first_name': 'Eve'}, format='json')
        self.assertEqual(locked.status_code, 409)
        self.assertEqual(EntryForm.objects.get().first_name, 'Ada')

    def test_applicant_cannot_set_status(self):
        self.authorize(self.register().data['access'])
        response = self.client.put('/api/entry_form/mine/', {'status': 'Accepted', 'answer': 'x'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(EntryForm.objects.get().status, 'Draft')

    def test_applications_are_private(self):
        self.authorize(self.register().data['access'])
        self.client.put('/api/entry_form/mine/', {'answer': 'mine'}, format='json')

        self.client.credentials()
        self.authorize(self.register(email='other@school.org').data['access'])
        self.assertEqual(self.client.get('/api/entry_form/').data, [])
        self.assertEqual(self.client.get('/api/entry_form/mine/').status_code, 404)

    def test_application_requires_auth(self):
        self.assertEqual(self.client.put('/api/entry_form/mine/', {}, format='json').status_code, 401)
        self.assertEqual(CustomUser.objects.count(), 0)
