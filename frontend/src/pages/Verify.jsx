import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import CollegePicker from '../components/college/CollegePicker';
import { membershipDetails, membershipReady } from '../components/college/MembershipFields';
import PageHeader from '../components/ui/PageHeader';
import MethodStep from '../components/verify/MethodStep';
import RoleStep from '../components/verify/RoleStep';
import Stepper from '../components/verify/Stepper';
import VerifySuccess from '../components/verify/VerifySuccess';
import { useAuth } from '../context/AuthContext';
import { useBadges } from '../context/BadgeContext';

/**
 * Three-step wizard: choose (or add) a college → role, degree and batch → email OTP or document upload. Members can
 * verify several colleges; `?entry=<id>` starts from an unverified college in their education.
 */
export default function Verify() {
  const { user, setUser } = useAuth();
  const { refresh } = useBadges();
  const [params] = useSearchParams();
  const entry = user.memberships?.find((item) => item._id === params.get('entry') && !item.verified);
  const [details, setDetails] = useState(() => (entry ? { level: '', degree: '', batch: '', graduation: '', ...entry } : { role: user.type === 'professional' ? 'alumni' : user.type, level: '', degree: '', batch: '', graduation: '' }));
  const [step, setStep] = useState(entry ? (membershipReady(details) ? 3 : 2) : 1);
  const [college, setCollege] = useState(entry?.college ?? null);
  const [result, setResult] = useState(null);

  const payload = { college: college?._id, ...membershipDetails(details) };
  const screen = result ? `done-${result}` : step;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={user.verified ? 'Verify another college' : 'Verify your college'} subtitle="Join its private members-only group" back="/college" />
      {!result && <Stepper step={step} />}
      <AnimatePresence mode="wait">
        <motion.div key={screen} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
          {result && <VerifySuccess college={college} pending={result === 'pending'} />}
          {!result && step === 1 && (
            <CollegePicker
              onSelect={(picked) => {
                setCollege(picked);
                setStep(2);
              }}
            />
          )}
          {!result && step === 2 && <RoleStep college={college} details={details} onChange={(change) => setDetails((current) => ({ ...current, ...change }))} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
          {!result && step === 3 && (
            <MethodStep
              college={college}
              details={payload}
              onBack={() => setStep(2)}
              onVerified={(updated) => {
                setResult('verified');
                setUser(updated);
                refresh();
              }}
              onSubmitted={() => setResult('pending')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
