import { Amplify } from 'aws-amplify'

Amplify.configure({
  Auth: {
    Cognito: {
      region: import.meta.env.VITE_COGNITO_REGION,
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
      // Custom UI only — no hosted UI, no OIDC
      loginWith: {
        email: true,
        phone: true,
      },
    },
  },
})
