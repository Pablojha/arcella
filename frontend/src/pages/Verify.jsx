import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import CollegePicker from '../components/college/CollegePicker';
import PageHeader from '../components/ui/PageHeader';
import MethodStep from '../components/verify/MethodStep';
import RoleStep from '../components/verify/RoleStep';
import Stepper from '../components/verify/Stepper';
import VerifySuccess from '../components/verify/VerifySuccess';
import { useAuth } from '../context/AuthContext';
import { useBadges } from '../context/BadgeContext';

/** Three-step wizard: choose (or add) a college → role and batch → email OTP or document upload. */
export default function Verify() {
  const { user, setUser } = useAuth();
  const { refresh } = useBadges();
  const [step, setStep] = useState(1);
  const [college, setCollege] = useState(null);
  const [details, setDetails] = useState({ role: user.type === 'professional' ? 'alumni' : user.type, batch: '' });
  const [result, setResult] = useState(null);

  if (user.verified && !result) return <Navigate to="/college" replace />;

  const payload = { college: college?._id, role: details.role, ...(details.role !== 'faculty' && { batch: details.batch }) };
  const screen = result ? `done-${result}` : step;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Verify your college" subtitle="Join your college's private group" back="/college" />
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
          {!result && step === 2 && <RoleStep college={college} role={details.role} batch={details.batch} onChange={(change) => setDetails((current) => ({ ...current, ...change }))} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
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
