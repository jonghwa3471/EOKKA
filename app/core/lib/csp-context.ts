import { createContext, useContext } from "react";

export const CspNonceContext = createContext<string | undefined>(undefined);
export const useCspNonce = () => useContext(CspNonceContext);
