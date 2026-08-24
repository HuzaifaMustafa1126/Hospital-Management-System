export const money=(value)=>`PKR ${Number(value||0).toLocaleString("en-PK",{minimumFractionDigits:0,maximumFractionDigits:2})}`;
