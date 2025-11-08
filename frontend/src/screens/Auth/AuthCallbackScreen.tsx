// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
//   Platform,
// } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { supabase } from '../../services/supabase';
// import CosmicBackground from '../../components/shared/CosmicBackground';
// import { tokenService } from '../../services/tokenService';
//
// const AuthCallbackScreen: React.FC = () => {
//   const navigation = useNavigation();
//   const [error, setError] = useState<string | null>(null);
//
//   useEffect(() => {
//     // не-await, чтобы не блокировать render
//     void handleCallback();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);
//
//   const handleCallback = async () => {
//     try {
//       console.log('🔍 ========== AUTH CALLBACK START ==========');
//
//       if (Platform.OS === 'web') {
//         const url = new URL(window.location.href);
//         const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
//         const searchParams = url.searchParams;
//         const getParam = (key: string) =>
//           hashParams.get(key) || searchParams.get(key);
//
//         const errorParam = getParam('error') || getParam('error_description');
//         if (errorParam) throw new Error(decodeURIComponent(errorParam));
//
//         let accessToken = getParam('access_token');
//         let refreshToken = getParam('refresh_token');
//         const code = getParam('code');
//
//         console.log('📍 URL Parameters:', {
//           hasAccessToken: !!accessToken,
//           hasCode: !!code,
//           tokenPreview: accessToken
//             ? accessToken.substring(0, 30) + '...'
//             : null,
//         });
//
//         // Устанавливаем сессию: access_token (hash) или code (query)
//         if (accessToken) {
//           const { error } = await supabase.auth.setSession({
//             access_token: accessToken,
//             refresh_token: refreshToken || '',
//           });
//           if (error) {
//             console.error('❌ setSession error:', error);
//             throw error;
//           }
//         } else if (code) {
//           const { error } = await supabase.auth.exchangeCodeForSession(code);
//           if (error) {
//             console.error('❌ exchangeCodeForSession error:', error);
//             throw error;
//           }
//           // После обмена кодом достаём актуальный токен из сессии
//           const { data: s } = await supabase.auth.getSession();
//           accessToken = s.session?.access_token || null;
//           refreshToken = s.session?.refresh_token || null;
//         } else {
//           // Фолбэк: может быть, другая вкладка уже сделала setSession
//           const storedToken = await tokenService.getToken();
//           if (storedToken) {
//             const { error } = await supabase.auth.setSession({
//               access_token: storedToken,
//               refresh_token: '',
//             });
//             if (error) {
//               console.error('❌ setSession from storedToken error:', error);
//               throw error;
//             }
//             accessToken = storedToken;
//           } else {
//             throw new Error('Токен или код авторизации не найдены в URL');
//           }
//         }
//
//         // Сохраняем токен локально (idempotent)
//         if (accessToken) {
//           await tokenService.setToken(accessToken);
//           console.log('💾 Token saved to TokenService');
//         } else {
//           console.warn(
//             '⚠️ No access token available after session establishment'
//           );
//         }
//
//         // Оповещаем вкладку ожидания (BroadcastChannel) + дублируем в localStorage
//         try {
//           // @ts-ignore
//           const bc = new BroadcastChannel('supabase-auth');
//           bc.postMessage({
//             type: 'SIGNED_IN',
//             accessToken,
//             refreshToken: refreshToken || '',
//             ts: Date.now(),
//           });
//           bc.close();
//           console.log('📡 BroadcastChannel message sent successfully');
//         } catch (bcError) {
//           console.warn('⚠️ BroadcastChannel failed:', bcError);
//         } finally {
//           // Всегда пишем флаги в localStorage, чтобы другая вкладка могла опросить
//           try {
//             if (accessToken) {
//               localStorage.setItem('al_token_value', accessToken);
//             }
//             localStorage.setItem('al_token_broadcast', String(Date.now()));
//             console.log(
//               '💾 localStorage flags written (al_token_value, al_token_broadcast)'
//             );
//           } catch (storageError) {
//             console.error('❌ localStorage write failed:', storageError);
//           }
//         }
//
//         // Очищаем URL и передаём управление загрузчику данных
//         try {
//           window.history.replaceState(
//             {},
//             document.title,
//             window.location.pathname
//           );
//         } catch {}
//         // @ts-ignore
//         navigation.reset({
//           index: 0,
//           routes: [{ name: 'UserDataLoader' }],
//         });
//
//         console.log(
//           '🔍 ========== AUTH CALLBACK END (WEB → LOADER) =========='
//         );
//         return;
//       }
//
//       // 📱 Mobile: просто подтверждаем сессию и уходим в загрузчик
//       const {
//         data: { session },
//         error: sessionError,
//       } = await supabase.auth.getSession();
//
//       if (sessionError || !session) {
//         throw new Error('Сессия не найдена');
//       }
//
//       console.log('✅ Session obtained:', session.user?.email);
//
//       await tokenService.setToken(session.access_token);
//
//       // @ts-ignore
//       navigation.reset({
//         index: 0,
//         routes: [{ name: 'UserDataLoader' }],
//       });
//
//       console.log(
//         '🔍 ========== AUTH CALLBACK END (MOBILE → LOADER) =========='
//       );
//     } catch (err: any) {
//       console.error('❌ ========== AUTH CALLBACK ERROR ==========');
//       console.error('Error details:', err);
//       console.error('Stack:', err?.stack);
//
//       setError(err?.message || 'Ошибка авторизации');
//
//       // Через 3 секунды переходим на экран входа
//       setTimeout(() => {
//         // @ts-ignore
//         navigation.navigate('SignUp');
//       }, 3000);
//     }
//   };
//
//   return (
//     <View style={styles.container}>
//       <CosmicBackground />
//
//       <View style={styles.content}>
//         {error ? (
//           <>
//             <Text style={styles.errorIcon}>⚠️</Text>
//             <Text style={styles.errorTitle}>Ошибка</Text>
//             <Text style={styles.errorText}>{error}</Text>
//             <Text style={styles.redirectText}>
//               Перенаправление на экран входа...
//             </Text>
//           </>
//         ) : (
//           <>
//             <ActivityIndicator size="large" color="#8B5CF6" />
//             <Text style={styles.text}>Завершение авторизации...</Text>
//           </>
//         )}
//       </View>
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#0D0618',
//   },
//   content: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingHorizontal: 24,
//   },
//   text: {
//     fontFamily: 'Montserrat_500Medium',
//     fontSize: 18,
//     color: '#FFFFFF',
//     marginTop: 24,
//     textAlign: 'center',
//   },
//   errorIcon: {
//     fontSize: 64,
//     marginBottom: 16,
//   },
//   errorTitle: {
//     fontFamily: 'Montserrat_600SemiBold',
//     fontSize: 24,
//     color: '#FF6B6B',
//     marginBottom: 12,
//   },
//   errorText: {
//     fontFamily: 'Montserrat_400Regular',
//     fontSize: 16,
//     color: 'rgba(255, 255, 255, 0.7)',
//     textAlign: 'center',
//     marginBottom: 24,
//   },
//   redirectText: {
//     fontFamily: 'Montserrat_400Regular',
//     fontSize: 14,
//     color: 'rgba(255, 255, 255, 0.5)',
//     textAlign: 'center',
//   },
// });
//
// export default AuthCallbackScreen;

// src/screens/auth/AuthCallbackScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { supabase } from '../../services/supabase';
import { tokenService } from '../../services/tokenService';
import { AUTH_COLORS, AUTH_TYPOGRAPHY } from '../../constants/auth.constants';

const AuthCallbackScreen: React.FC = () => {
  const navigation = useNavigation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      if (Platform.OS === 'web') {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const searchParams = url.searchParams;
        const getParam = (key: string) =>
          hashParams.get(key) || searchParams.get(key);

        const errorParam = getParam('error') || getParam('error_description');
        if (errorParam) throw new Error(decodeURIComponent(errorParam));

        let accessToken = getParam('access_token');
        let refreshToken = getParam('refresh_token');
        const code = getParam('code');

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          const { data: s } = await supabase.auth.getSession();
          accessToken = s.session?.access_token || null;
          refreshToken = s.session?.refresh_token || null;
        } else {
          const storedToken = await tokenService.getToken();
          if (storedToken) {
            const { error } = await supabase.auth.setSession({
              access_token: storedToken,
              refresh_token: '',
            });
            if (error) throw error;
            accessToken = storedToken;
          } else {
            throw new Error('Токен или код авторизации не найдены в URL');
          }
        }

        if (accessToken) {
          await tokenService.setToken(accessToken);
        }

        try {
          // @ts-ignore
          const bc = new BroadcastChannel('supabase-auth');
          bc.postMessage({
            type: 'SIGNED_IN',
            accessToken,
            refreshToken: refreshToken || '',
            ts: Date.now(),
          });
          bc.close();
        } catch (bcError) {
          console.warn('BroadcastChannel failed:', bcError);
        } finally {
          try {
            if (accessToken) {
              localStorage.setItem('al_token_value', accessToken);
            }
            localStorage.setItem('al_token_broadcast', String(Date.now()));
          } catch (storageError) {
            console.error('localStorage write failed:', storageError);
          }
        }

        try {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        } catch {}

        // @ts-ignore
        navigation.reset({
          index: 0,
          routes: [{ name: 'UserDataLoader' }],
        });
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Сессия не найдена');
      }

      await tokenService.setToken(session.access_token);

      // @ts-ignore
      navigation.reset({
        index: 0,
        routes: [{ name: 'UserDataLoader' }],
      });
    } catch (err: any) {
      setError(err?.message || 'Ошибка авторизации');
      setTimeout(() => {
        // @ts-ignore
        navigation.navigate('SignUp');
      }, 3000);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.content}>
        {error ? (
          <>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Ошибка</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.redirectText}>
              Перенаправление на экран входа...
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={AUTH_COLORS.loaderPrimary} />
            <Text style={styles.text}>Завершение авторизации...</Text>
          </>
        )}
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    ...AUTH_TYPOGRAPHY.body,
    color: AUTH_COLORS.text,
    marginTop: 24,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: AUTH_COLORS.error,
    marginBottom: 12,
  },
  errorText: {
    ...AUTH_TYPOGRAPHY.hint,
    color: AUTH_COLORS.textDim70,
    textAlign: 'center',
    marginBottom: 24,
  },
  redirectText: {
    ...AUTH_TYPOGRAPHY.hint,
    color: AUTH_COLORS.textDim50,
    textAlign: 'center',
  },
});

export default AuthCallbackScreen;
