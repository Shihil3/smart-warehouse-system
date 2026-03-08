import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";
import axios from "axios";

function PalletScanner() {

  useEffect(() => {

    const scanner = new Html5QrcodeScanner(
      "scanner",
      { fps: 10, qrbox: 250 }
    );

    scanner.render(onScanSuccess);

    let lastScan = "";

    function onScanSuccess(decodedText) {

      console.log("Scanned:", decodedText);

      if(decodedText === lastScan) return;

      lastScan = decodedText;

      axios.post("http://localhost:4567/scan", {
        pallet_code: decodedText
      })
      .then(res => {
         const pallet = res.data.pallet;

        setScannedPallet(pallet.id);
      });

    }

  }, []);

  return (
    <div>
      <h2>Scan Pallet</h2>
      <div id="scanner"></div>
    </div>
  );
}

export default PalletScanner;
