import Taro from '@tarojs/taro'
import { api } from './api'

const TOKEN_KEY = 'smart-fridge-token'
const PROFILE_ID_KEY = 'smart-fridge-profile-id'

export async function login() {
  const res = await api.localLogin()
  api.setToken(res.access_token)
  Taro.setStorageSync(TOKEN_KEY, res.access_token)
  Taro.setStorageSync(PROFILE_ID_KEY, res.profile_id)
  return res
}

export async function tryAutoLogin() {
  // Use cached token if available
  const token = Taro.getStorageSync(TOKEN_KEY) || null
  if (token) {
    api.setToken(token)
    return true
  }
  // No token — create a new session
  await login()
  return true
}

// Call this when API returns 401 — clears old token and re-logins
export async function forceRelogin() {
  Taro.removeStorageSync(TOKEN_KEY)
  Taro.removeStorageSync(PROFILE_ID_KEY)
  await login()
}
