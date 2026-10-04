import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Droplets, User, Phone, Info, Gift, Facebook, PhoneCall, LogOut, Search, Shield, Key, History, TrendingUp, TrendingDown, Settings, Trash2, AlertTriangle, X, Megaphone, Video, Save, XCircle, Camera, Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { BBWashLogo } from './components/BBWashLogo';
import { MemberQRCode } from './components/MemberQRCode';
import { AdminQRScanner } from './components/AdminQRScanner';

// 1. ตั้งค่าการเชื่อมต่อ Firebase ของร้าน BB Wash & Dry
const firebaseConfig = {
  apiKey: "AIzaSyBw2lifIHg4AHO8-4WIxIL97PvoUsMQMos",
  authDomain: "bb-wash-and-dry.firebaseapp.com",
  projectId: "bb-wash-and-dry",
  storageBucket: "bb-wash-and-dry.firebasestorage.app",
  messagingSenderId: "616091807332",
  appId: "1:616091807332:web:46e8f625d8ea37f5c9b971",
  measurementId: "G-JSQFK6DD8J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export interface HistoryItem {
  date: string;
  amount: number;
  type: 'earn' | 'use';
  note: string;
}

export interface UserData {
  name: string;
  phone: string;
  pin: string;
  points: number;
  history: HistoryItem[];
  joinedAt?: string;
  email?: string;
  photoURL?: string;
  authProvider?: 'phone' | 'google';
}

export interface AnnouncementData {
  text?: string;
  videoUrl?: string;
  isActive?: boolean;
  updatedAt?: string;
}

// ฟังก์ชันสำหรับดึงรหัสวิดีโอ YouTube มาเล่นในเว็บ
const getYoutubeEmbedUrl = (url?: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
};

// -----------------------------------------
// Component: หน้าเข้าสู่ระบบ & สมัครสมาชิก
// -----------------------------------------
const AuthScreen = ({ onLogin }: { onLogin: (user: UserData) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginInput, setLoginInput] = useState(''); // เบอร์โทรศัพท์ หรือ Gmail
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // สำหรับกรณีล็อกอินด้วย Google สำเร็จ แต่ยังไม่มีเบอร์โทรในระบบ (ต้องผูกเบอร์เพื่อใช้สะสมแต้มหน้าร้าน)
  const [googlePendingUser, setGooglePendingUser] = useState<{
    email: string;
    name: string;
    photoURL?: string;
    uid?: string;
  } | null>(null);
  const [bindPhone, setBindPhone] = useState('');
  const [bindPin, setBindPin] = useState('123456');

  // สำหรับกรณีต้องการกรอกฟอร์มสมัครด้วย Gmail โดยตรง
  const [showDirectGmailModal, setShowDirectGmailModal] = useState(false);
  const [directEmail, setDirectEmail] = useState('');
  const [directName, setDirectName] = useState('');
  const [directPhone, setDirectPhone] = useState('');
  const [directPin, setDirectPin] = useState('');

  // ฟังก์ชันสมัคร/เข้าสู่ระบบด้วย Google ผ่าน Firebase Popup
  const handleGoogleAuth = async () => {
    setError('');
    setInfoMsg('');
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;
      const gEmail = (gUser.email || '').trim().toLowerCase();
      const gName = gUser.displayName || 'สมาชิก BB Wash';
      const gPhoto = gUser.photoURL || '';

      if (!gEmail) {
        throw new Error('ไม่พบข้อมูลอีเมลจากบัญชี Google');
      }

      // ค้นหาใน Firestore ว่ามีลูกค้าที่ใช้อีเมลนี้แล้วหรือไม่
      const q = query(collection(db, 'users'), where('email', '==', gEmail));
      const qSnap = await getDocs(q);

      if (!qSnap.empty) {
        // พบบัญชีเดิมที่ผูกกับ Gmail นี้ -> เข้าสู่ระบบทันที
        const existingData = qSnap.docs[0].data() as UserData;
        onLogin(existingData);
        setGoogleLoading(false);
        return;
      }

      // ตรวจสอบจากเบอร์โทรหาก Google มีส่งมา
      if (gUser.phoneNumber) {
        const phoneClean = gUser.phoneNumber.replace(/\D/g, '');
        const snap = await getDoc(doc(db, 'users', phoneClean));
        if (snap.exists()) {
          const existingData = snap.data() as UserData;
          await updateDoc(doc(db, 'users', phoneClean), {
            email: gEmail,
            photoURL: gPhoto || existingData.photoURL || '',
            authProvider: 'google'
          });
          onLogin({ ...existingData, email: gEmail, photoURL: gPhoto, authProvider: 'google' });
          setGoogleLoading(false);
          return;
        }
      }

      // หากเป็นสมาชิกใหม่จาก Gmail: ให้ระบุเบอร์โทรศัพท์สำหรับใช้สะสมแต้มหน้าร้าน
      setGooglePendingUser({
        email: gEmail,
        name: gName,
        photoURL: gPhoto,
        uid: gUser.uid
      });
      setBindPhone('');
      setBindPin('123456');
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // ผู้ใช้ปิดหน้าต่าง popup เอง
      } else if (err.code === 'auth/unauthorized-domain' || err.code === 'auth/popup-blocked' || err.code === 'auth/configuration-not-found') {
        // หากเปิด popup ไม่ได้เนื่องจากโดเมนหรือการบล็อก ให้เปิดฟอร์มสมัครด้วย Gmail โดยตรง
        setDirectEmail(err.customData?.email || '');
        setShowDirectGmailModal(true);
      } else {
        setError(err.message || 'ไม่สามารถเชื่อมต่อ Google ได้ในขณะนี้');
        setShowDirectGmailModal(true);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ยืนยันการผูกเบอร์โทรศัพท์สำหรับสมาชิก Google รายใหม่
  const handleConfirmGoogleBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googlePendingUser) return;
    setError('');

    const cleanPhone = bindPhone.replace(/[-\s]/g, '');
    if (cleanPhone.length < 9) {
      setError('กรุณากรอกเบอร์โทรศัพท์อย่างน้อย 9-10 หลัก');
      return;
    }
    if (bindPin.length !== 6 && bindPin.length !== 4) {
      setError('กรุณากำหนดรหัส PIN 6 หลัก');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', cleanPhone);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // หากเบอร์นี้เคยสมัครไว้แล้วที่หน้าร้าน -> นำ Gmail มาผูกเข้ากับบัตรสมาชิกเดิม (คะแนนไม่หาย!)
        const existingData = userSnap.data() as UserData;
        await updateDoc(userRef, {
          email: googlePendingUser.email,
          photoURL: googlePendingUser.photoURL || existingData.photoURL || '',
          authProvider: 'google'
        });
        onLogin({
          ...existingData,
          email: googlePendingUser.email,
          photoURL: googlePendingUser.photoURL || existingData.photoURL,
          authProvider: 'google'
        });
      } else {
        // สร้างบัตรสมาชิกใหม่
        const newUser: UserData = {
          name: googlePendingUser.name,
          phone: cleanPhone,
          pin: bindPin,
          email: googlePendingUser.email,
          photoURL: googlePendingUser.photoURL || '',
          points: 0,
          history: [],
          authProvider: 'google',
          joinedAt: new Date().toISOString()
        };
        await setDoc(userRef, newUser);
        onLogin(newUser);
      }
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสมัครสมาชิกด้วย Gmail ผ่านฟอร์มตรง
  const handleDirectGmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = directEmail.trim().toLowerCase();
    const cleanPhone = directPhone.replace(/[-\s]/g, '');

    if (!cleanEmail.includes('@')) {
      setError('กรุณาระบุอีเมล Gmail ให้ถูกต้อง (เช่น example@gmail.com)');
      return;
    }
    if (cleanPhone.length < 9) {
      setError('กรุณากรอกเบอร์โทรศัพท์อย่างน้อย 9-10 หลัก');
      return;
    }
    if (directPin.length !== 6 && directPin.length !== 4) {
      setError('กรุณากำหนดรหัส PIN 6 หลัก');
      return;
    }
    if (!directName.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }

    setLoading(true);
    try {
      // ตรวจสอบว่ามีอีเมลนี้หรือยัง
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        setError('อีเมล Gmail นี้มีในระบบแล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและ PIN');
        setLoading(false);
        return;
      }

      // ตรวจสอบเบอร์โทร
      const userRef = doc(db, 'users', cleanPhone);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        // หากเบอร์โทรนี้เคยลงทะเบียนไว้แล้ว สามารถผูก Gmail นี้เข้าไปได้
        const existingData = userSnap.data() as UserData;
        await updateDoc(userRef, {
          email: cleanEmail,
          authProvider: 'google'
        });
        setShowDirectGmailModal(false);
        onLogin({ ...existingData, email: cleanEmail, authProvider: 'google' });
        return;
      }

      const newUser: UserData = {
        name: directName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        pin: directPin,
        points: 0,
        history: [],
        authProvider: 'google',
        joinedAt: new Date().toISOString()
      };
      await setDoc(userRef, newUser);
      setShowDirectGmailModal(false);
      onLogin(newUser);
    } catch (err) {
      console.error(err);
      setError('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันส่งฟอร์มหลัก
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isLogin) {
      const trimmedInput = loginInput.trim();
      if (!trimmedInput) {
        setError('กรุณากรอกเบอร์โทรศัพท์ หรือ อีเมล Gmail');
        return;
      }
      if (pin.length !== 6 && pin.length !== 4) {
        setError('กรุณากรอกรหัส PIN ให้ถูกต้อง');
        return;
      }

      setLoading(true);
      try {
        if (trimmedInput.includes('@')) {
          // ค้นหาด้วยอีเมล
          const q = query(collection(db, 'users'), where('email', '==', trimmedInput.toLowerCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const userData = snap.docs[0].data() as UserData;
            if (userData.pin === pin) {
              onLogin(userData);
            } else {
              setError('รหัส PIN ไม่ถูกต้อง');
            }
          } else {
            setError('ไม่พบบัญชีที่ใช้อีเมลนี้ในระบบ กรุณาสมัครสมาชิก');
          }
        } else {
          // ค้นหาด้วยเบอร์โทร
          const cleanPhone = trimmedInput.replace(/[-\s]/g, '');
          const userRef = doc(db, 'users', cleanPhone);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data() as UserData;
            if (userData.pin === pin) {
              onLogin(userData);
            } else {
              setError('รหัส PIN ไม่ถูกต้อง');
            }
          } else {
            setError('ไม่พบเบอร์โทรศัพท์นี้ในระบบ กรุณาสมัครสมาชิก');
          }
        }
      } catch (err) {
        console.error(err);
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
      }
      setLoading(false);
    } else {
      // หน้าสมัครสมาชิกแบบกรอกเบอร์
      const cleanPhone = phone.replace(/[-\s]/g, '');
      if (cleanPhone.length < 9) {
        setError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
        return;
      }
      if (pin.length !== 6 && pin.length !== 4) {
        setError('กรุณากรอก PIN 6 หลัก');
        return;
      }
      if (!name.trim()) {
        setError('กรุณากรอกชื่อ-นามสกุล');
        return;
      }

      setLoading(true);
      try {
        const userRef = doc(db, 'users', cleanPhone);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setError('เบอร์โทรศัพท์นี้ลงทะเบียนไปแล้ว กรุณาเข้าสู่ระบบ');
        } else {
          const newUser: UserData = {
            name: name.trim(),
            phone: cleanPhone,
            email: email.trim().toLowerCase() || undefined,
            pin,
            points: 0,
            history: [],
            joinedAt: new Date().toISOString()
          };
          await setDoc(userRef, newUser);
          onLogin(newUser);
        }
      } catch (err) {
        console.error(err);
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-center mb-5">
            <div className="relative p-1 bg-white rounded-full shadow-xl shadow-yellow-500/10 border-2 border-yellow-400/40">
              <BBWashLogo className="w-28 h-28 drop-shadow-md transition-transform hover:scale-105 duration-300" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-center text-white mb-1 uppercase tracking-wider">BB Wash & Dry</h2>
          <p className="text-center text-yellow-400 text-xs font-semibold mb-2" style={{ borderColor: '#e2b406' }}>ร้านสะดวกซัก 24 ชั่วโมง</p>
          <p className="text-center text-zinc-400 text-sm mb-6">
            {isLogin ? 'เข้าสู่ระบบเพื่อดูคะแนนสะสม' : 'สมัครสมาชิกเพื่อสะสมคะแนน'}
          </p>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-3 rounded-xl mb-4 text-center">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 text-sm p-3 rounded-xl mb-4 text-center">
              {infoMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isLogin ? (
              /* ฟิลด์เข้าสู่ระบบ: รองรับทั้งเบอร์โทร และ Gmail */
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">
                  เบอร์โทรศัพท์ หรือ อีเมล Gmail
                </label>
                <div className="relative">
                  <User className="absolute inset-y-0 left-4 my-auto h-5 w-5 text-zinc-500" />
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none"
                    placeholder="08X-XXX-XXXX หรือ your@gmail.com"
                    required
                  />
                </div>
              </div>
            ) : (
              /* ฟิลด์สมัครสมาชิกใหม่ */
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">ชื่อ-นามสกุล</label>
                  <div className="relative">
                    <User className="absolute inset-y-0 left-4 my-auto h-5 w-5 text-zinc-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none"
                      placeholder="กรอกชื่อของคุณ"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">
                    อีเมล Gmail <span className="text-zinc-500 text-[10px]">(ไม่บังคับ)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute inset-y-0 left-4 my-auto h-5 w-5 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none"
                      placeholder="yourname@gmail.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">เบอร์โทรศัพท์ (สำหรับสะสมแต้ม)</label>
                  <div className="relative">
                    <Phone className="absolute inset-y-0 left-4 my-auto h-5 w-5 text-zinc-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none"
                      placeholder="08X-XXX-XXXX"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">รหัส PIN 6 หลัก</label>
              <div className="relative">
                <Key className="absolute inset-y-0 left-4 my-auto h-5 w-5 text-zinc-500" />
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none tracking-[0.5em] font-mono text-lg"
                  placeholder="••••••"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-3.5 px-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] disabled:opacity-70 cursor-pointer hover:brightness-105"
            >
              {loading ? 'กำลังประมวลผล...' : (isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
            </button>
          </form>

          {/* โซนตัวเลือกสมัครสมาชิกและเข้าสู่ระบบด้วย Gmail (Targeted by CSS Selector) */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
            <div className="relative flex items-center mb-4">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                หรือเข้าใช้งานด้วย
              </span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            {/* ปุ่มสมัครสมาชิก / เข้าสู่ระบบด้วย Gmail */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800/90 hover:bg-zinc-700/80 active:scale-[0.98] border border-zinc-700 hover:border-yellow-400/60 py-3.5 px-4 rounded-xl text-white font-bold transition-all shadow-md cursor-pointer disabled:opacity-60 group"
            >
              <svg className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span className="text-sm">
                {googleLoading ? 'กำลังเชื่อมต่อ Google...' : (isLogin ? 'เข้าสู่ระบบด้วย Google / Gmail' : 'สมัครสมาชิกด้วย Gmail')}
              </span>
            </button>

            {/* ทางเลือกลงทะเบียน Gmail โดยตรง */}
            <div className="mt-3.5 flex items-center justify-center gap-1 text-xs text-zinc-400">
              <Mail className="w-3.5 h-3.5 text-red-400 inline" />
              <span>ต้องการกรอกข้อมูลด้วย Gmail?</span>
              <button
                type="button"
                onClick={() => { setShowDirectGmailModal(true); setError(''); }}
                className="text-yellow-400 hover:underline font-semibold cursor-pointer ml-1"
              >
                สมัครด้วยฟอร์ม Gmail
              </button>
            </div>

            {/* สลับไปมาระหว่างเข้าสู่ระบบและสมัครสมาชิก */}
            <div className="mt-4 pt-3 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={() => { 
                  setIsLogin(!isLogin); 
                  setError(''); 
                  setInfoMsg('');
                }}
                className="text-zinc-400 text-sm hover:text-yellow-400 transition-colors cursor-pointer"
              >
                {isLogin ? (
                  <span>ยังไม่มีบัญชีสมาชิก? <strong className="text-yellow-400 underline underline-offset-4">สมัครสมาชิกใหม่</strong></span>
                ) : (
                  <span>มีบัญชีสมาชิกแล้ว? <strong className="text-yellow-400 underline underline-offset-4">เข้าสู่ระบบ</strong></span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: ผูกเบอร์โทรศัพท์สำหรับสมาชิก Google รายใหม่ */}
      {googlePendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-yellow-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setGooglePendingUser(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="relative inline-block mb-3">
                {googlePendingUser.photoURL ? (
                  <img
                    src={googlePendingUser.photoURL}
                    alt={googlePendingUser.name}
                    className="w-16 h-16 rounded-full border-2 border-yellow-400 mx-auto object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto text-xl font-bold">
                    {googlePendingUser.name.charAt(0)}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">{googlePendingUser.name}</h3>
              <p className="text-xs text-yellow-400 flex items-center justify-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-red-400" />
                {googlePendingUser.email}
              </p>
              <div className="mt-3 bg-zinc-800/80 border border-zinc-700/60 p-2.5 rounded-xl text-left text-xs text-zinc-300">
                💡 <span className="font-semibold text-yellow-400">ระบุเบอร์โทรศัพท์</span> เพื่อใช้สะสมคะแนนหน้าร้านและสร้าง QR Code บัตรสมาชิกดิจิทัล (หากเคยมีบัตรเดิม ระบบจะผูกแต้มให้ทันที)
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 text-xs p-2.5 rounded-xl mb-3 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleConfirmGoogleBinding} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">เบอร์โทรศัพท์สำหรับสะสมแต้ม</label>
                <div className="relative">
                  <Phone className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-zinc-500" />
                  <input
                    type="tel"
                    value={bindPhone}
                    onChange={(e) => setBindPhone(e.target.value)}
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none text-sm"
                    placeholder="08X-XXX-XXXX"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">กำหนดรหัส PIN 6 หลัก</label>
                <div className="relative">
                  <Key className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    maxLength={6}
                    value={bindPin}
                    onChange={(e) => setBindPin(e.target.value)}
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none tracking-[0.3em] font-mono text-sm"
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-3 px-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] disabled:opacity-70 cursor-pointer text-sm"
              >
                {loading ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันและเปิดใช้งานบัตรสมาชิก'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: สมัครสมาชิกด้วยฟอร์ม Gmail โดยตรง */}
      {showDirectGmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-yellow-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowDirectGmailModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">สมัครสมาชิกด้วย Gmail</h3>
                <p className="text-xs text-zinc-400">กรอกข้อมูลเพื่อเชื่อมต่อบัตรสมาชิก</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-400 text-xs p-2.5 rounded-xl mb-3 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleDirectGmailSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">อีเมล Gmail</label>
                <div className="relative">
                  <Mail className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none text-sm"
                    placeholder="example@gmail.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">ชื่อ-นามสกุล</label>
                <div className="relative">
                  <User className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none text-sm"
                    placeholder="กรอกชื่อของคุณ"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">เบอร์โทรศัพท์ (สำหรับสะสมแต้ม)</label>
                <div className="relative">
                  <Phone className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-zinc-500" />
                  <input
                    type="tel"
                    value={directPhone}
                    onChange={(e) => setDirectPhone(e.target.value)}
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none text-sm"
                    placeholder="08X-XXX-XXXX"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">รหัส PIN 6 หลัก</label>
                <div className="relative">
                  <Key className="absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    maxLength={6}
                    value={directPin}
                    onChange={(e) => setDirectPin(e.target.value)}
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-black border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:border-yellow-500 focus:outline-none tracking-[0.3em] font-mono text-sm"
                    placeholder="••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-3 px-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] disabled:opacity-70 cursor-pointer text-sm"
              >
                {loading ? 'กำลังบันทึกข้อมูล...' : 'สมัครสมาชิกด้วย Gmail'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------
// Component: หน้าจัดการร้านค้า (Admin)
// -----------------------------------------
const AdminDashboard = ({
  announcement,
  fetchAnnouncement
}: {
  announcement: AnnouncementData | null;
  fetchAnnouncement: () => void;
}) => {
  const [searchPhone, setSearchPhone] = useState('');
  const [customer, setCustomer] = useState<UserData | null>(null);
  const [editPoints, setEditPoints] = useState<string | number>('');
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // States สำหรับการจัดการประกาศ
  const [annText, setAnnText] = useState(announcement?.text || '');
  const [annVideo, setAnnVideo] = useState(announcement?.videoUrl || '');
  const [annLoading, setAnnLoading] = useState(false);
  const [annMsg, setAnnMsg] = useState('');

  // ฟังก์ชันค้นหาลูกค้าจากเบอร์โทร
  const lookupPhone = async (phoneToSearch: string) => {
    setLoading(true);
    setMsg('');
    setShowDeleteConfirm(false);
    setSearchPhone(phoneToSearch);
    try {
      const docRef = doc(db, 'users', phoneToSearch);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as UserData;
        setCustomer(data);
        setEditPoints(data.points);
        setEditName(data.name);
        setMsg(`✓ พบข้อมูลลูกค้า: ${data.name}`);
      } else {
        setCustomer(null);
        setMsg(`ไม่พบข้อมูลลูกค้าเบอร์ ${phoneToSearch} ในระบบ`);
      }
    } catch (err) {
      setMsg('เกิดข้อผิดพลาดในการค้นหา');
    }
    setLoading(false);
  };

  // ค้นหาลูกค้า
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone) return;
    await lookupPhone(searchPhone.trim());
  };

  // อัปเดตลูกค้า
  const handleUpdate = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const newPoints = Number(editPoints);
      const diff = newPoints - customer.points;
      let updatedHistory: HistoryItem[] = customer.history || [];

      if (diff !== 0) {
        const newLog: HistoryItem = {
          date: new Date().toISOString(),
          amount: Math.abs(diff),
          type: diff > 0 ? 'earn' : 'use',
          note: diff > 0 ? 'ได้รับคะแนน (Admin)' : 'ใช้คะแนน / แลกส่วนลด (Admin)'
        };
        updatedHistory = [newLog, ...updatedHistory].slice(0, 20);
      }

      const docRef = doc(db, 'users', customer.phone);
      await updateDoc(docRef, { 
        points: newPoints,
        name: editName,
        history: updatedHistory
      });
      
      setCustomer({ ...customer, points: newPoints, name: editName, history: updatedHistory });
      setMsg('บันทึกข้อมูลเรียบร้อยแล้ว!');
    } catch (err) {
      setMsg('เกิดข้อผิดพลาดในการบันทึก');
    }
    setLoading(false);
  };

  // ลบลูกค้า
  const handleDeleteUser = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', customer.phone));
      setCustomer(null);
      setSearchPhone('');
      setShowDeleteConfirm(false);
      setMsg('ลบบัญชีลูกค้ารายนี้ออกจากระบบถาวรแล้ว');
    } catch (err) {
      setMsg('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
    setLoading(false);
  };

  // บันทึกประกาศร้านค้า
  const handleSaveAnnouncement = async (isActive: boolean) => {
    setAnnLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'announcement'), {
        text: annText,
        videoUrl: annVideo,
        isActive: isActive,
        updatedAt: new Date().toISOString()
      });
      setAnnMsg(isActive ? 'อัปเดตและเปิดใช้งานประกาศแล้ว!' : 'ปิดประกาศเรียบร้อยแล้ว');
      fetchAnnouncement(); // รีเฟรชข้อมูลประกาศทันที
    } catch (err) {
      setAnnMsg('เกิดข้อผิดพลาดในการบันทึกประกาศ');
    }
    setAnnLoading(false);
    setTimeout(() => setAnnMsg(''), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="bg-yellow-500 text-black p-4 rounded-2xl flex items-center shadow-lg font-bold">
        <Shield className="w-6 h-6 mr-3" />
        <div>
          <h2 className="text-lg">ระบบจัดการร้านค้า (Admin)</h2>
          <p className="text-xs font-normal opacity-80">เฉพาะเจ้าของร้านเท่านั้น</p>
        </div>
      </div>

      {/* 1. ส่วนจัดการลูกค้า */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h3 className="text-white mb-4 font-medium flex items-center justify-between">
          <span className="flex items-center">
            <User className="w-5 h-5 text-yellow-500 mr-2" /> ค้นหาลูกค้าเพื่อจัดการข้อมูล
          </span>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-bold rounded-xl border border-yellow-500/30 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4" /> สแกน QR Code
          </button>
        </h3>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="tel"
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="flex-1 px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:border-yellow-500 focus:outline-none"
            placeholder="เบอร์โทรลูกค้า หรือ สแกน QR"
            required
          />
          <button 
            type="button" 
            onClick={() => setShowScanner(true)}
            className="bg-yellow-500 text-black px-3.5 py-3 rounded-xl hover:bg-yellow-400 transition-colors flex items-center justify-center cursor-pointer"
            title="สแกนกล้อง QR Code"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button type="submit" disabled={loading} className="bg-zinc-800 text-white px-4 py-3 rounded-xl hover:bg-zinc-700 cursor-pointer">
            <Search className="w-5 h-5" />
          </button>
        </form>
        {msg && <p className={`text-sm mt-3 text-center ${msg.includes('เรียบร้อย') || msg.includes('ลบ') || msg.includes('พบข้อมูล') ? 'text-green-400' : 'text-yellow-500'}`}>{msg}</p>}
      </div>

      {/* กล้องสแกน QR Code สำหรับแอดมิน */}
      <AdminQRScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={(scannedPhone) => {
          lookupPhone(scannedPhone);
        }}
      />

      {customer && (
        <div className="bg-black border border-yellow-500/50 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4 border-b border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-zinc-400 text-sm">เบอร์โทร: {customer.phone}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-sm mb-2">แก้ไขชื่อลูกค้า:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:border-yellow-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-2">แก้ไขคะแนนสะสม:</label>
              <input
                type="number"
                value={editPoints}
                onChange={(e) => setEditPoints(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-2xl font-bold text-center focus:border-yellow-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-3.5 rounded-xl shadow-lg"
            >
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      )}

      {/* 2. ส่วนจัดการประกาศประชาสัมพันธ์ */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
        <h3 className="text-white mb-4 font-bold flex items-center text-lg">
          <Megaphone className="w-6 h-6 text-orange-500 mr-2" /> จัดการประกาศร้านค้า
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-sm mb-2">ข้อความประชาสัมพันธ์:</label>
            <textarea
              value={annText}
              onChange={(e) => setAnnText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:border-orange-500 focus:outline-none resize-none"
              placeholder="เช่น แจ้งเตือนโปรโมชั่นใหม่, ร้านปิดทำการชั่วคราว..."
            ></textarea>
          </div>

          <div>
            <label className="block text-zinc-400 text-sm mb-2">แนบลิงก์คลิปวิดีโอ (YouTube):</label>
            <div className="relative">
              <Video className="absolute inset-y-0 left-3 my-auto h-5 w-5 text-zinc-500" />
              <input
                type="url"
                value={annVideo}
                onChange={(e) => setAnnVideo(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:border-orange-500 focus:outline-none text-sm"
                placeholder="เช่น https://www.youtube.com/watch?v=..."
              />
            </div>
          </div>
          
          {annMsg && <p className={`text-sm text-center ${annMsg.includes('ปิด') ? 'text-red-400' : 'text-green-400'}`}>{annMsg}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleSaveAnnouncement(false)}
              disabled={annLoading}
              className="flex-1 flex items-center justify-center py-3 bg-zinc-800 text-red-400 hover:bg-zinc-700 hover:text-red-300 font-bold rounded-xl transition-colors"
            >
              <XCircle className="w-5 h-5 mr-1" /> ปิดประกาศ
            </button>
            <button
              onClick={() => handleSaveAnnouncement(true)}
              disabled={annLoading || (!annText && !annVideo)}
              className="flex-[2] flex items-center justify-center py-3 bg-orange-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:bg-orange-400 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-1" /> บันทึก & เผยแพร่
            </button>
          </div>
        </div>
      </div>

      {/* Modal ยืนยันการลบของ Admin */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-900 border border-red-500/50 rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">ยืนยันการลบลูกค้า?</h3>
            <p className="text-zinc-400 text-sm text-center mb-6">คุณกำลังจะลบข้อมูลของ <strong className="text-white">{customer?.name}</strong> ประวัติและคะแนนสะสมทั้งหมดจะสูญหายถาวร</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-bold">ยกเลิก</button>
              <button onClick={handleDeleteUser} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">ยืนยันการลบ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------
// Component: หน้าบัตรสมาชิก (Dashboard)
// -----------------------------------------
const Dashboard = ({
  user,
  setUser,
  announcement
}: {
  user: UserData;
  setUser: (user: UserData | null) => void;
  announcement: AnnouncementData | null;
}) => {
  const points = user.points || 0;
  const target = 10;
  const progressPercentage = Math.min((points / target) * 100, 100);

  // States สำหรับแก้ไขบัญชี
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email || '');
  const [editPin, setEditPin] = useState(user.pin);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editPin.length !== 6 && editPin.length !== 4) {
      setMsg('PIN ต้องมี 6 หลัก');
      return;
    }
    setSaving(true);
    try {
      const cleanEmail = editEmail.trim().toLowerCase();
      await updateDoc(doc(db, 'users', user.phone), { 
        name: editName, 
        pin: editPin,
        email: cleanEmail || null 
      });
      setUser({ 
        ...user, 
        name: editName, 
        pin: editPin, 
        email: cleanEmail || undefined 
      });
      setMsg('อัปเดตข้อมูลสำเร็จ!');
      setTimeout(() => setShowSettings(false), 1500);
    } catch (err) {
      setMsg('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'users', user.phone));
      setUser(null);
    } catch (err) {
      setMsg('เกิดข้อผิดพลาดในการลบข้อมูล');
      setSaving(false);
    }
  };

  const youtubeEmbed = getYoutubeEmbedUrl(announcement?.videoUrl);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* 🌟 ประกาศประชาสัมพันธ์จากร้านค้า */}
      {announcement?.isActive && (
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-orange-400 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-20">
            <Megaphone className="w-20 h-20 text-orange-500 -rotate-12" />
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-orange-600 flex items-center mb-2">
              <Megaphone className="w-5 h-5 mr-2 animate-bounce" /> ประกาศจากร้านค้า
            </h3>
            {announcement.text && (
              <p className="text-zinc-800 text-sm whitespace-pre-wrap leading-relaxed mb-3 font-medium">
                {announcement.text}
              </p>
            )}
            {youtubeEmbed && (
              <div className="relative w-full rounded-xl overflow-hidden shadow-md mt-2 aspect-video">
                <iframe 
                  className="absolute top-0 left-0 w-full h-full"
                  src={youtubeEmbed} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ข้อมูลสมาชิก */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <BBWashLogo className="w-28 h-28" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-white rounded-full p-0.5 border-2 border-yellow-500 flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <BBWashLogo className="w-full h-full" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-lg font-bold text-white truncate">{user.name}</h2>
                {user.email && (
                  <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold flex-shrink-0">
                    <Mail className="w-2.5 h-2.5" /> Gmail
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400 flex items-center mt-0.5 font-mono">
                 โทร: {user.phone}
              </p>
              {user.email && (
                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5 truncate max-w-[200px]" title={user.email}>
                  <Mail className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={() => { setShowSettings(true); setMsg(''); }}
            className="p-2.5 bg-black/50 border border-zinc-700 text-zinc-300 rounded-full hover:text-yellow-400 transition-colors flex-shrink-0 cursor-pointer"
            title="ตั้งค่าบัญชี"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 🌟 QR Code สมาชิกสำหรับร้านค้าสแกน */}
      <MemberQRCode user={user} />

      {/* คะแนนสะสม */}
      <div className="bg-gradient-to-br from-black to-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl shadow-black/50">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-zinc-400 text-sm font-medium mb-1">คะแนนสะสมปัจจุบัน</p>
            <div className="flex items-baseline space-x-2">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                {points}
              </span>
              <span className="text-zinc-500 font-medium">/ {target} คะแนน</span>
            </div>
          </div>
          <div className="bg-zinc-800 p-3 rounded-2xl border border-zinc-700 shadow-inner">
            <Gift className={`w-8 h-8 ${points >= target ? 'text-orange-500 animate-bounce' : 'text-zinc-600'}`} />
          </div>
        </div>

        <div className="relative w-full h-4 bg-zinc-800 rounded-full overflow-hidden mt-6 mb-2 border border-zinc-900 shadow-inner">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 transition-all duration-1000 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <p className="text-xs text-center text-zinc-500 mt-3 font-medium">
          {points >= target 
            ? '🎉 ยินดีด้วย! คุณสามารถแลกส่วนลดได้แล้ว' 
            : `สะสมอีก ${target - points} คะแนน เพื่อแลกส่วนลด 30 บาท`}
        </p>
      </div>

      {/* ประวัติการใช้คะแนน */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h3 className="text-white font-bold mb-4 flex items-center">
          <History className="w-5 h-5 text-yellow-500 mr-2" />
          ประวัติคะแนนสะสม
        </h3>
        
        <div className="space-y-3">
          {(!user.history || user.history.length === 0) ? (
            <p className="text-zinc-500 text-sm text-center py-4">ยังไม่มีประวัติการทำรายการ</p>
          ) : (
            user.history.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-black p-3 rounded-xl border border-zinc-800">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${item.type === 'earn' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {item.type === 'earn' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.note}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(item.date).toLocaleDateString('th-TH', { 
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
                <div className={`font-bold ${item.type === 'earn' ? 'text-green-500' : 'text-red-500'}`}>
                  {item.type === 'earn' ? '+' : '-'}{item.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: การตั้งค่าบัญชี & ลบบัญชี */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 sm:p-4 pb-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            
            {!showDeleteConfirm ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center"><Settings className="w-5 h-5 mr-2 text-yellow-500"/> ตั้งค่าบัญชี</h3>
                  <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white"><X className="w-6 h-6"/></button>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">ชื่อ-นามสกุล</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:border-yellow-500 focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">อีเมล Gmail</label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:border-yellow-500 focus:outline-none" placeholder="yourname@gmail.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1 ml-1">เปลี่ยนรหัส PIN (6 หลัก)</label>
                    <input type="password" maxLength={6} value={editPin} onChange={(e) => setEditPin(e.target.value)} className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:border-yellow-500 focus:outline-none tracking-[0.5em] font-mono" placeholder="••••••" required />
                  </div>
                  {msg && <p className={`text-sm text-center ${msg.includes('สำเร็จ') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
                  
                  <button type="submit" disabled={saving} className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl mt-2 hover:bg-yellow-400 cursor-pointer">
                    {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-zinc-800">
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="w-full flex items-center justify-center py-3 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5 mr-2" /> ลบบัญชีผู้ใช้งาน
                  </button>
                </div>
              </>
            ) : (
              /* โซนยืนยันการลบบัญชี */
              <div className="text-center py-4">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-red-500 mb-2">ยืนยันการลบบัญชี?</h3>
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mb-6">
                  <p className="text-white text-sm font-medium mb-1">คำเตือน!</p>
                  <p className="text-zinc-400 text-sm">หากลบบัญชีแล้ว <strong>ประวัติการใช้งานและคะแนนสะสมทั้งหมดจะถูกลบอย่างถาวร</strong> และจะไม่สามารถกู้คืนกลับมาได้อีกหลังจากกดยืนยัน</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3.5 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 cursor-pointer">
                    ยกเลิก, กลับไป
                  </button>
                  <button onClick={handleDeleteAccount} disabled={saving} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] cursor-pointer">
                    {saving ? 'กำลังลบ...' : 'ยืนยัน, ลบทิ้งถาวร'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------
// Component: หน้าเงื่อนไขและโปรโมชั่น
// -----------------------------------------
const TermsAndConditions = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-zinc-800">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-center relative overflow-hidden flex flex-col items-center">
          <div className="mb-3 p-1.5 bg-white rounded-full shadow-lg border-2 border-yellow-300">
            <BBWashLogo className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-black tracking-wide mb-1 uppercase drop-shadow-sm">
              BB WASH & DRY
            </h2>
            <div className="inline-block bg-black text-yellow-400 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
              ร้านสะดวกซัก 24 ชั่วโมง
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-6 text-center border-b border-orange-100">
          <p className="text-[15px] text-zinc-800 font-bold mb-4 leading-relaxed">
            เมื่อทำการสมัครสมาชิก อย่าลืมแจ้งชื่อหรือเบอร์โทร<br/>
            <span className="text-orange-600">เพื่อสะสมคะแนนก่อนชำระค่าบริการ</span>
          </p>
          
          <div className="bg-white border-2 border-orange-400 rounded-2xl p-5 shadow-sm my-5">
            <p className="text-sm text-zinc-500 font-medium mb-1">สะสมครบ 10 คะแนน</p>
            <p className="text-2xl font-black text-orange-500">แลกส่วนลด 30 บาท</p>
            <p className="text-xs text-zinc-400 mt-2 font-medium bg-zinc-100 inline-block px-3 py-1 rounded-full">(เฉพาะซักหรืออบ)</p>
          </div>
          
          <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-left">
            <p className="text-xs font-bold text-red-600 leading-relaxed">
              * การใช้ส่วนลด 30 บาท ใช้ได้เพียงวันละ 1 ครั้งต่อหมายเลขสมาชิก<br/>
              * (จำกัดการใช้ส่วนลดเฉพาะสาขาเกาะคา บ้านผึ้ง เท่านั้น)
            </p>
          </div>
        </div>

        <div className="p-6 bg-white">
          <h4 className="text-base font-black text-black mb-5 flex items-center">
            <Info className="w-5 h-5 text-orange-500 mr-2" />
            เงื่อนไขการใช้โปรโมชั่น
          </h4>
          <ul className="space-y-4 text-sm text-zinc-700">
            {[
              "แจ้งชื่อหรือเบอร์โทรศัพท์ที่ใช้สมัครสมาชิกก่อนชำระค่าบริการทุกครั้ง",
              "สะสมคะแนนได้เฉพาะช่วงเวลา 07.00 - 18.00 น. ของทุกวัน",
              "การสะสมคะแนนไม่สามารถทำย้อนหลังได้",
              "สะสมครบ 10 คะแนนแล้วใช้ส่วนลด 30 บาทได้ในครั้งถัดไป",
              "จำกัดการใช้ส่วนลด 30 บาทได้เพียงวันละ 1 ครั้งต่อหมายเลขสมาชิก",
              "ส่วนลดใช้ได้เฉพาะการใช้บริการซักหรืออบแต่เพียงเท่านั้น",
              "คะแนนไม่สามารถแลก เปลี่ยน หรือทอนเป็นเงินสดได้",
              "ร้านขอสงวนสิทธิ์ในการเปลี่ยนแปลงเงื่อนไขโดยไม่ต้องแจ้งให้ทราบล่วงหน้า"
            ].map((text, idx) => (
              <li key={idx} className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 font-bold rounded-full flex items-center justify-center text-xs mr-3 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 text-center flex flex-col items-center gap-4 rounded-3xl mt-6 shadow-lg">
        <a
          href="https://lin.ee/ZVmXIBA"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 bg-[#06C755] hover:bg-[#05a546] text-white py-3.5 px-6 rounded-2xl w-full transition-all shadow-md"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.961 8.877 9.475 9.615.39.083.921.258 1.058.59.123.298.082.76.038 1.055l-.261 1.579c-.066.39-.311 1.536 1.348.838 1.658-.696 8.948-5.267 11.233-8.625 1.488-2.148 1.109-5.052 1.109-5.052zm-14.887 2.144H6.386a.658.658 0 0 1-.657-.657V7.027a.658.658 0 0 1 .657-.657h2.727c.362 0 .657.295.657.657 0 .362-.295.657-.657.657H7.7v1.173h1.413c.362 0 .657.295.657.657 0 .362-.295.657-.657.657H7.7v1.272h1.413c.362 0 .657.295.657.657 0 .362-.295.657-.657.657zm3.179 0h-1.314a.658.658 0 0 1-.657-.657V7.027c0-.362.295-.657.657-.657h1.314c.362 0 .657.295.657.657v4.764c0 .362-.295.657-.657.657zm4.847-3.054v2.397c0 .362-.295.657-.657.657h-.001a.659.659 0 0 1-.622-.444l-2.072-4.996v4.783c0 .362-.295.657-.657.657h-.001a.658.658 0 0 1-.657-.657V7.027c0-.362.295-.657.657-.657h.001c.264 0 .504.157.607.397l2.088 5.038V7.027c0-.362.295-.657.657-.657h.001c.362 0 .657.295.657.657v2.365z"/>
          </svg>
          <span className="font-bold text-sm">ติดต่อ / เพิ่มเพื่อน LINE</span>
        </a>

        <a
          href="https://www.facebook.com/profile.php?id=61566553000066"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-blue-600 text-white py-3.5 px-6 rounded-2xl w-full transition-all shadow-md"
        >
          <Facebook className="w-5 h-5" fill="currentColor" />
          <span className="font-bold text-sm">ติดตามข้อมูลข่าวสารทาง Facebook</span>
        </a>

        <div className="flex items-center justify-center gap-2 mt-2">
          <PhoneCall className="w-4 h-4 text-zinc-500" />
          <p className="text-sm text-zinc-400">
            สอบถามเพิ่มเติม โทร: 
            <a href="tel:0922929456" className="text-yellow-400 font-bold ml-1">092 2929 456</a>
          </p>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------
// Component หลัก: ควบคุมแอปพลิเคชันทั้งหมด
// -----------------------------------------
export default function App() {
  const [user, setUser] = useState<UserData | null>(() => {
    try {
      const saved = localStorage.getItem('bbwash_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'terms'>('dashboard');
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);

  const handleSetUser = (userData: UserData | null) => {
    setUser(userData);
    if (userData) {
      try {
        localStorage.setItem('bbwash_current_user', JSON.stringify(userData));
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem('bbwash_current_user');
      } catch (e) {}
    }
  };

  const isAdmin = user?.phone === '0922929456';

  // ดึงข้อมูลประกาศจากระบบ
  const fetchAnnouncement = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'announcement'));
      if (snap.exists()) setAnnouncement(snap.data() as AnnouncementData);
    } catch (err) {
      console.error("Error fetching announcement:", err);
    }
  };

  // ดึงข้อมูลลูกค้า
  const fetchUser = async (phone: string) => {
    try {
      const docRef = doc(db, 'users', phone);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        handleSetUser(snap.data() as UserData);
      }
      fetchAnnouncement(); // ดึงประกาศใหม่ด้วยเมื่อรีเฟรช
    } catch (err) {
      console.error(err);
    }
  };

  // ดึงประกาศตอนโหลดแอปครั้งแรก
  useEffect(() => {
    fetchAnnouncement();
  }, []);

  if (!user) {
    return <AuthScreen onLogin={(userData) => handleSetUser(userData)} />;
  }

  return (
    <div className="min-h-screen bg-black font-sans text-zinc-100 max-w-md mx-auto shadow-2xl relative">
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-xl border-b border-zinc-800/80 pt-5 pb-3 px-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-full p-0.5 border border-yellow-400/80 flex items-center justify-center shadow-md">
            <BBWashLogo className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase leading-none">BB Wash<span className="text-yellow-500">&</span>Dry</h1>
            <p className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase mt-1">ร้านสะดวกซัก 24 ชั่วโมง</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isAdmin && (
            <button 
              onClick={() => fetchUser(user.phone)}
              className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full hover:text-yellow-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <History className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => handleSetUser(null)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="pt-6 px-4 pb-24 min-h-[calc(100vh-160px)]">
        <div className="flex space-x-2 bg-zinc-900 p-1.5 rounded-2xl mb-6">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-zinc-800 text-yellow-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {isAdmin ? 'ระบบจัดการ' : 'บัตรสมาชิก'}
          </button>
          <button 
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'terms' ? 'bg-zinc-800 text-orange-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            เงื่อนไข & โปรโมชั่น
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          isAdmin ? 
            <AdminDashboard announcement={announcement} fetchAnnouncement={fetchAnnouncement} /> : 
            <Dashboard user={user} setUser={handleSetUser} announcement={announcement} />
        ) : (
          <TermsAndConditions />
        )}
      </main>
    </div>
  );
}
