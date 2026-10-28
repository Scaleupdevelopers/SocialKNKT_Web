import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { SignIn } from './pages/signin/SignIn'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { VerifyCode } from './pages/auth/VerifyCode'
import ResetPassword from './pages/auth/ResetPassword'
import PasswordSuccess from './pages/auth/PasswordSuccess'
import { ContactUs } from './pages/auth/ContactUs'
import { SignUp } from './pages/signup/SignUp'
import { VerifyAccount } from './pages/auth/VerifyAccount'
import { AccountCreated } from './pages/auth/AccountCreated'
import { WorkExperience } from './pages/auth/WorkExperience'

import './styles/globals.css'
import './pages/signin/SignIn.css'
import './pages/auth/ForgotPassword.css'
import './pages/auth/VerifyCode.css'
import './pages/auth/PasswordPages.css'
import './pages/auth/ContactUs.css'
import './pages/signup/SignUp.css'
import './pages/auth/VerifyAccount.css'
import './pages/auth/AccountCreated.css'
import './pages/auth/WorkExperience.css'

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
      </Routes>
    </BrowserRouter>
  )
}

export default App
