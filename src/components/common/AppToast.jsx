import { ToastContainer } from 'react-toastify'

import 'react-toastify/dist/ReactToastify.css'

export function AppToast() {
  return (
    <ToastContainer
      position="top-center"
      autoClose={2000}
      hideProgressBar
      newestOnTop
      closeOnClick
      pauseOnHover
      theme="dark"
      toastStyle={{
        textAlign: 'center',
      }}
    />
  )
}
