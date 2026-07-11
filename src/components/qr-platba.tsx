"use client";

import { QRCodeSVG } from "qrcode.react";

/**
 * QR platba (SPAYD). Vždy tmavá na světlé, aby ji přečetla jakákoli banka —
 * nezávisle na motivu aplikace.
 */
export function QrPlatba({
  value,
  size = 132,
}: {
  value: string;
  size?: number;
}) {
  return (
    <div className="inline-block rounded-lg bg-white p-2">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={0}
        bgColor="#ffffff"
        fgColor="#0a0a0a"
      />
    </div>
  );
}
