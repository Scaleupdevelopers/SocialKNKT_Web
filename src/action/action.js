import {
  getRequest,
  postRequest,
} from "../utils/helper";

//------------------|| USER AUTH ||------------------//

export const login = async (data) => {
  const res = await postRequest("auth/login", data);
  return res;
};

export const refreshToken = async (data) => {
  const res = await postRequest("auth/refreshToken", data);
  return res;
};

export const logout = async (data) => {
  const res = await postRequest("auth/logout", data);
  return res;
};

export const userList = async (data) => {
  const res = await getRequest("userList", data);
  return res;
};
