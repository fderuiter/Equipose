data _null_;
  a = 1812433253;
  b = 4294967295;
  
  a_hi = int(a / 65536); a_lo = mod(a, 65536);
  b_hi = int(b / 65536); b_lo = mod(b, 65536);
  
  prod = mod(mod(a_hi * b_lo + a_lo * b_hi, 65536) * 65536 + a_lo * b_lo, 4294967296);
  put "Safe prod: " prod;
run;
