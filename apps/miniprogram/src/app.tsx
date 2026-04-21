import { PropsWithChildren } from 'react'
import { useDidShow } from '@tarojs/taro'
import './app.scss'
import { tryAutoLogin, forceRelogin } from './services/auth'
import { useFridgeStore } from './stores/fridgeStore'

function App({ children }: PropsWithChildren) {
  const fetchAll = useFridgeStore((s) => s.fetchAll)

  useDidShow(() => {
    tryAutoLogin()
      .then(() => fetchAll())
      .catch(() => {
        // Token expired — re-login with new session, then fetch
        forceRelogin().then(() => fetchAll()).catch(console.error)
      })
  })

  return children
}

export default App
