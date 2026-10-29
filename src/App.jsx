import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { SignIn } from './pages/signin/SignIn'
import { ForgotPassword } from './pages/password/ForgotPassword'
import { VerifyCode } from './pages/verification/VerifyCode'
import ResetPassword from './pages/password/ResetPassword'
import PasswordSuccess from './pages/password/PasswordSuccess'
import { ContactUs } from './pages/support/ContactUs'
import { SignUp } from './pages/signup/SignUp'
import { VerifyAccount } from './pages/verification/VerifyAccount'
import { AccountCreated } from './pages/signup/AccountCreated'
import { WorkExperience } from './pages/onboarding/WorkExperience'
import { Education } from './pages/onboarding/Education'
import { Location } from './pages/onboarding/Location'
import { Pronunciation } from './pages/onboarding/Pronunciation'
import { AddMedia } from './pages/onboarding/AddMedia'
import { Home } from './pages/home/Home'

import './styles/globals.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/password-success" element={<PasswordSuccess />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/verify-account" element={<VerifyAccount />} />
        <Route path="/account-created" element={<AccountCreated />} />
        <Route path="/work-experience" element={<WorkExperience />} />
        <Route path="/education" element={<Education />} />
        <Route path="/location" element={<Location />} />
        <Route path="/pronunciation" element={<Pronunciation />} />
        <Route path="/add-media" element={<AddMedia />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
