import { initFirebaseClient } from '@synapse/firebase/client';
import {
  getLimitedUseToken,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from 'firebase/app-check';
import {
  type Auth,
  type MultiFactorError,
  type TotpSecret,
  TotpMultiFactorGenerator,
  getAuth,
  getMultiFactorResolver,
  multiFactor,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { env } from '../../lib/env';

export interface TotpEnrollment {
  readonly secret: TotpSecret;
  readonly secretKey: string;
  readonly qrCodeUrl: string;
}

export class AuthService {
  private readonly auth: Auth;
  private readonly appCheck: AppCheck;

  constructor() {
    const app = initFirebaseClient(env.firebase);
    const siteKey = env.firebase.VITE_FIREBASE_APP_CHECK_SITE_KEY;
    if (!siteKey) throw new Error('VITE_FIREBASE_APP_CHECK_SITE_KEY não configurada');
    this.auth = getAuth(app);
    this.appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  async signIn(email: string, password: string, requestTotp: () => Promise<string>) {
    try {
      return await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code !== 'auth/multi-factor-auth-required') throw error;
      const resolver = getMultiFactorResolver(this.auth, error as MultiFactorError);
      const hint = resolver.hints.find(
        (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID,
      );
      if (!hint) throw new Error('Nenhum fator TOTP disponível');
      const code = await requestTotp();
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code);
      return resolver.resolveSignIn(assertion);
    }
  }

  recoverPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async beginTotpEnrollment(displayName = 'Synapse'): Promise<TotpEnrollment> {
    const user = this.auth.currentUser;
    if (!user?.email) throw new Error('Usuário autenticado com e-mail é obrigatório');
    if (!user.emailVerified) throw new Error('Confirme o e-mail antes de ativar MFA');
    const session = await multiFactor(user).getSession();
    const secret = await TotpMultiFactorGenerator.generateSecret(session);
    return {
      secret,
      secretKey: secret.secretKey,
      qrCodeUrl: secret.generateQrCodeUrl(user.email, displayName),
    };
  }

  async completeTotpEnrollment(
    enrollment: TotpEnrollment,
    verificationCode: string,
    displayName = 'Aplicativo autenticador',
  ): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
      enrollment.secret,
      verificationCode,
    );
    await multiFactor(user).enroll(assertion, displayName);
  }

  async apiHeaders(sessionId?: string): Promise<Record<string, string>> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');
    const [idToken, appCheckToken] = await Promise.all([
      user.getIdToken(),
      getLimitedUseToken(this.appCheck),
    ]);
    return {
      Authorization: `Bearer ${idToken}`,
      'X-Firebase-AppCheck': appCheckToken.token,
      ...(sessionId ? { 'X-Device-Session': sessionId } : {}),
    };
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }
}
