import { createContext, useContext } from "react";

const NumberFormattingContext = createContext(true);

export const NumberFormattingProvider = NumberFormattingContext.Provider;

export const useNumberFormatting = () => useContext(NumberFormattingContext);
