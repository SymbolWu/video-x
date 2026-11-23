var StudioCinema = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../video-x/design/2026-11-redesign/src/components/generated/cinemaCatalog.ts
  var cinemaCatalog_exports = {};
  __export(cinemaCatalog_exports, {
    categories: () => categories,
    films: () => films,
    people: () => people,
    series: () => series
  });

  // ../video-x/design/2026-11-redesign/assets/cinema/693134-poster.jpg
  var poster_default = "./cinema/693134-poster-YEFO35SF.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/693134-backdrop.jpg
  var backdrop_default = "./cinema/693134-backdrop-Z746LC6V.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1190668.jpg
  var person_1190668_default = "./cinema/person-1190668-4S4BZ4S6.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-505710.jpg
  var person_505710_default = "./cinema/person-505710-CQFLEJKM.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-933238.jpg
  var person_933238_default = "./cinema/person-933238-2E27N55L.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/129-poster.jpg
  var poster_default2 = "./cinema/129-poster-VSN2ND4Y.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/129-backdrop.jpg
  var backdrop_default2 = "./cinema/129-backdrop-LOVDF3VU.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-19587.jpg
  var person_19587_default = "./cinema/person-19587-LC5BECK5.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-19588.jpg
  var person_19588_default = "./cinema/person-19588-RCJE6EBK.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-19589.jpg
  var person_19589_default = "./cinema/person-19589-WG5BDZXF.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/843-poster.jpg
  var poster_default3 = "./cinema/843-poster-WRJP3GA2.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/843-backdrop.jpg
  var backdrop_default3 = "./cinema/843-backdrop-5BCNN35U.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1338.jpg
  var person_1338_default = "./cinema/person-1338-J2W3SM2C.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1337.jpg
  var person_1337_default = "./cinema/person-1337-D53XEI3T.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-12674.jpg
  var person_12674_default = "./cinema/person-12674-S5D4ZJ6S.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/157336-poster.jpg
  var poster_default4 = "./cinema/157336-poster-KBYCTJIH.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/157336-backdrop.jpg
  var backdrop_default4 = "./cinema/157336-backdrop-2WJZHOTC.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-10297.jpg
  var person_10297_default = "./cinema/person-10297-X7PO5ONZ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1813.jpg
  var person_1813_default = "./cinema/person-1813-3PCIXLTD.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-3895.jpg
  var person_3895_default = "./cinema/person-3895-KWOXW3K2.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/120467-poster.jpg
  var poster_default5 = "./cinema/120467-poster-ETKTXAK7.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/120467-backdrop.jpg
  var backdrop_default5 = "./cinema/120467-backdrop-Q5L2T25U.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-5469.jpg
  var person_5469_default = "./cinema/person-5469-47KJFMLN.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1164.jpg
  var person_1164_default = "./cinema/person-1164-3SAZBQLN.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1291350.jpg
  var person_1291350_default = "./cinema/person-1291350-TTLGSBOT.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/324857-poster.jpg
  var poster_default6 = "./cinema/324857-poster-UXRNHC7B.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/324857-backdrop.jpg
  var backdrop_default6 = "./cinema/324857-backdrop-TM2G5EUY.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-587506.jpg
  var person_587506_default = "./cinema/person-587506-3A5EBESV.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-543505.jpg
  var person_543505_default = "./cinema/person-543505-EVZQNF2C.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-130640.jpg
  var person_130640_default = "./cinema/person-130640-7JSO6TVB.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/313369-poster.jpg
  var poster_default7 = "./cinema/313369-poster-YVGBVJ3Q.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/313369-backdrop.jpg
  var backdrop_default7 = "./cinema/313369-backdrop-SJYMS6O3.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-30614.jpg
  var person_30614_default = "./cinema/person-30614-XZ5XQUOR.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-54693.jpg
  var person_54693_default = "./cinema/person-54693-V6KF6WM3.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-113461.jpg
  var person_113461_default = "./cinema/person-113461-MCZOKSE3.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/10775-poster.jpg
  var poster_default8 = "./cinema/10775-poster-ZZ2VZCRR.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/10775-backdrop.jpg
  var backdrop_default8 = "./cinema/10775-backdrop-R7TLJZYH.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-25246.jpg
  var person_25246_default = "./cinema/person-25246-H6GPMS3O.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-66717.jpg
  var person_66717_default = "./cinema/person-66717-YCCS4T33.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/10681-poster.jpg
  var poster_default9 = "./cinema/10681-poster-OZ5FQH4L.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/10681-backdrop.jpg
  var backdrop_default9 = "./cinema/10681-backdrop-UWVIG7QO.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-670.jpg
  var person_670_default = "./cinema/person-670-NS3UN32L.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-72754.jpg
  var person_72754_default = "./cinema/person-72754-GSOGROKJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-60074.jpg
  var person_60074_default = "./cinema/person-60074-TXOZD5YY.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/329865-poster.jpg
  var poster_default10 = "./cinema/329865-poster-HARRX2KV.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/329865-backdrop.jpg
  var backdrop_default10 = "./cinema/329865-backdrop-UCSGNLPO.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-9273.jpg
  var person_9273_default = "./cinema/person-9273-IWZADDSD.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-17604.jpg
  var person_17604_default = "./cinema/person-17604-HJTWVH6X.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-2178.jpg
  var person_2178_default = "./cinema/person-2178-PFUKIQIL.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/155-poster.jpg
  var poster_default11 = "./cinema/155-poster-NMBFSZBS.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/155-backdrop.jpg
  var backdrop_default11 = "./cinema/155-backdrop-DGVBQ7YE.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-3894.jpg
  var person_3894_default = "./cinema/person-3894-NL2NUYHE.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1810.jpg
  var person_1810_default = "./cinema/person-1810-OGV4EJXQ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-6383.jpg
  var person_6383_default = "./cinema/person-6383-HS4REUXX.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/128-poster.jpg
  var poster_default12 = "./cinema/128-poster-7RZMRXC6.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/128-backdrop.jpg
  var backdrop_default12 = "./cinema/128-backdrop-XZYVKQHC.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-622.jpg
  var person_622_default = "./cinema/person-622-Z7GW3HAN.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-20330.jpg
  var person_20330_default = "./cinema/person-20330-HWRB5SJD.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-20331.jpg
  var person_20331_default = "./cinema/person-20331-K6IR2HZ4.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/76341-poster.jpg
  var poster_default13 = "./cinema/76341-poster-BHE45HAL.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/76341-backdrop.jpg
  var backdrop_default13 = "./cinema/76341-backdrop-7EB27YTV.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-2524.jpg
  var person_2524_default = "./cinema/person-2524-WNWW6W7S.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-6885.jpg
  var person_6885_default = "./cinema/person-6885-TZPE3DDZ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-3292.jpg
  var person_3292_default = "./cinema/person-3292-JSJZEMWC.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/746-poster.jpg
  var poster_default14 = "./cinema/746-poster-XA5F7SZ3.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/746-backdrop.jpg
  var backdrop_default14 = "./cinema/746-backdrop-6TSDDYZA.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-11389.jpg
  var person_11389_default = "./cinema/person-11389-HKPVGX5L.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-6720.jpg
  var person_6720_default = "./cinema/person-6720-BQW2VCX5.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-11390.jpg
  var person_11390_default = "./cinema/person-11390-E5WC4EVB.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/33320-poster.jpg
  var poster_default15 = "./cinema/33320-poster-5NXGX2B7.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/33320-backdrop.jpg
  var backdrop_default15 = "./cinema/33320-backdrop-JUUSAHZJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-235332.jpg
  var person_235332_default = "./cinema/person-235332-FKKQ7MHX.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1680.jpg
  var person_1680_default = "./cinema/person-1680-7SVBIO3E.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-23988.jpg
  var person_23988_default = "./cinema/person-23988-K2XCV5UY.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/838240-poster.jpg
  var poster_default16 = "./cinema/838240-poster-EWS2FAR2.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/838240-backdrop.jpg
  var backdrop_default16 = "./cinema/838240-backdrop-H4CRG4AW.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-31415.jpg
  var person_31415_default = "./cinema/person-31415-HVAOGN3N.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/438631-poster.jpg
  var poster_default17 = "./cinema/438631-poster-QQLOW4KA.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/438631-backdrop.jpg
  var backdrop_default17 = "./cinema/438631-backdrop-J3SKJC44.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-25072.jpg
  var person_25072_default = "./cinema/person-25072-OTBXA74K.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/808-poster.jpg
  var poster_default18 = "./cinema/808-poster-MTD6MGIR.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/808-backdrop.jpg
  var backdrop_default18 = "./cinema/808-backdrop-FJCSBESZ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-12073.jpg
  var person_12073_default = "./cinema/person-12073-HVV24OHZ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-776.jpg
  var person_776_default = "./cinema/person-776-XPLBLRCH.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-6941.jpg
  var person_6941_default = "./cinema/person-6941-3DUPRFCD.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/569094-poster.jpg
  var poster_default19 = "./cinema/569094-poster-7CTAXKBQ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/569094-backdrop.jpg
  var backdrop_default19 = "./cinema/569094-backdrop-2MCKBSAO.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/496243-poster.jpg
  var poster_default20 = "./cinema/496243-poster-YVB2EJIJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/496243-backdrop.jpg
  var backdrop_default20 = "./cinema/496243-backdrop-ABSEYVDT.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-20738.jpg
  var person_20738_default = "./cinema/person-20738-G5VBRZMT.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-115290.jpg
  var person_115290_default = "./cinema/person-115290-233WCQDK.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-556435.jpg
  var person_556435_default = "./cinema/person-556435-6L65OQDJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/269149-poster.jpg
  var poster_default21 = "./cinema/269149-poster-ZCVCQPMX.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/269149-backdrop.jpg
  var backdrop_default21 = "./cinema/269149-backdrop-REIICNAB.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-417.jpg
  var person_417_default = "./cinema/person-417-GWDT6FCV.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-23532.jpg
  var person_23532_default = "./cinema/person-23532-HDOSEJVB.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-17605.jpg
  var person_17605_default = "./cinema/person-17605-4EDPEBLJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/272-poster.jpg
  var poster_default22 = "./cinema/272-poster-GRQIUHN3.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/272-backdrop.jpg
  var backdrop_default22 = "./cinema/272-backdrop-MSKA4MNZ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-3896.jpg
  var person_3896_default = "./cinema/person-3896-ZV6ZR4CU.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/49026-poster.jpg
  var poster_default23 = "./cinema/49026-poster-ELBNBLL7.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/49026-backdrop.jpg
  var backdrop_default23 = "./cinema/49026-backdrop-BL2R32MY.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-64.jpg
  var person_64_default = "./cinema/person-64-AVGNXNTU.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/10997-poster.jpg
  var poster_default24 = "./cinema/10997-poster-D67FC2B6.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/10997-backdrop.jpg
  var backdrop_default24 = "./cinema/10997-backdrop-OHKWSESJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-69637.jpg
  var person_69637_default = "./cinema/person-69637-BYXWWD3P.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-65277.jpg
  var person_65277_default = "./cinema/person-65277-ZAQXVAWK.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-643.jpg
  var person_643_default = "./cinema/person-643-3KNMQ7KM.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/146-poster.jpg
  var poster_default25 = "./cinema/146-poster-7YZL3F6T.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/146-backdrop.jpg
  var backdrop_default25 = "./cinema/146-backdrop-CNJ6LVTI.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1619.jpg
  var person_1619_default = "./cinema/person-1619-2SXKQY74.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1620.jpg
  var person_1620_default = "./cinema/person-1620-QBVHJUMM.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1339.jpg
  var person_1339_default = "./cinema/person-1339-AL6TDENA.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/9470-poster.jpg
  var poster_default26 = "./cinema/9470-poster-AVQEAEP3.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/9470-backdrop.jpg
  var backdrop_default26 = "./cinema/9470-backdrop-W7WZ3K3F.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-57607.jpg
  var person_57607_default = "./cinema/person-57607-45NAOMLY.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-119426.jpg
  var person_119426_default = "./cinema/person-119426-MOCW5BIE.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-57609.jpg
  var person_57609_default = "./cinema/person-57609-UWBK7DOM.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/150540-poster.jpg
  var poster_default27 = "./cinema/150540-poster-DBPLBRZK.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/150540-backdrop.jpg
  var backdrop_default27 = "./cinema/150540-backdrop-N6HA6GFJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-56322.jpg
  var person_56322_default = "./cinema/person-56322-O6N5AV2T.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-169200.jpg
  var person_169200_default = "./cinema/person-169200-E3DCCMT4.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-21125.jpg
  var person_21125_default = "./cinema/person-21125-DEM62CMI.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/1022789-poster.jpg
  var poster_default28 = "./cinema/1022789-poster-BAUY42FM.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/1022789-backdrop.jpg
  var backdrop_default28 = "./cinema/1022789-backdrop-N7GYF5TK.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1903874.jpg
  var person_1903874_default = "./cinema/person-1903874-IQEGJX5O.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-3020876.jpg
  var person_3020876_default = "./cinema/person-3020876-T3JLX6VE.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/19995-poster.jpg
  var poster_default29 = "./cinema/19995-poster-TA6SKW5Y.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/19995-backdrop.jpg
  var backdrop_default29 = "./cinema/19995-backdrop-VTF2OLLO.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-65731.jpg
  var person_65731_default = "./cinema/person-65731-VTQEBC3U.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-8691.jpg
  var person_8691_default = "./cinema/person-8691-62VLYITK.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-10205.jpg
  var person_10205_default = "./cinema/person-10205-LC7FTN4Z.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/76600-poster.jpg
  var poster_default30 = "./cinema/76600-poster-B5DKTUUM.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/76600-backdrop.jpg
  var backdrop_default30 = "./cinema/76600-backdrop-P2UMFLMC.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/582-poster.jpg
  var poster_default31 = "./cinema/582-poster-TVGPQJ5J.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/582-backdrop.jpg
  var backdrop_default31 = "./cinema/582-backdrop-CPS6BQYZ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-678.jpg
  var person_678_default = "./cinema/person-678-NDYUZUHJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-8196.jpg
  var person_8196_default = "./cinema/person-8196-BVA5P2PJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-8197.jpg
  var person_8197_default = "./cinema/person-8197-LUY5IOQD.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/354912-poster.jpg
  var poster_default32 = "./cinema/354912-poster-IKLYLG4C.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/354912-backdrop.jpg
  var backdrop_default32 = "./cinema/354912-backdrop-FM5J2N5V.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1193391.jpg
  var person_1193391_default = "./cinema/person-1193391-ZYOXGLQU.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-258.jpg
  var person_258_default = "./cinema/person-258-FXMCA5GG.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-4589.jpg
  var person_4589_default = "./cinema/person-4589-GEWW6ALC.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/1213-poster.jpg
  var poster_default33 = "./cinema/1213-poster-YOMV77IP.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/1213-backdrop.jpg
  var backdrop_default33 = "./cinema/1213-backdrop-BJ3OD5UK.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1892.jpg
  var person_1892_default = "./cinema/person-1892-NBA3TEFM.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-12052.jpg
  var person_12052_default = "./cinema/person-12052-FM3ULS2V.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-9642.jpg
  var person_9642_default = "./cinema/person-9642-WKISSAKA.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/13398-poster.jpg
  var poster_default34 = "./cinema/13398-poster-BQYQTQHG.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/13398-backdrop.jpg
  var backdrop_default34 = "./cinema/13398-backdrop-2WI7HIFA.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-117626.jpg
  var person_117626_default = "./cinema/person-117626-UCCGTX2M.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-117629.jpg
  var person_117629_default = "./cinema/person-117629-F5JKVIJD.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-40330.jpg
  var person_40330_default = "./cinema/person-40330-LKYQWDS5.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/515042-poster.jpg
  var poster_default35 = "./cinema/515042-poster-VVQTAWST.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/515042-backdrop.jpg
  var backdrop_default35 = "./cinema/515042-backdrop-BXNJXPZS.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-107800.jpg
  var person_107800_default = "./cinema/person-107800-ERBDKCLK.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-107798.jpg
  var person_107798_default = "./cinema/person-107798-GTI4DARU.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1403129.jpg
  var person_1403129_default = "./cinema/person-1403129-FWYNLUYS.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/1667-poster.jpg
  var poster_default36 = "./cinema/1667-poster-JITZOFF3.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/1667-backdrop.jpg
  var backdrop_default36 = "./cinema/1667-backdrop-RJN2TM5D.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-48576.jpg
  var person_48576_default = "./cinema/person-48576-XYEX2IZH.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-40938.jpg
  var person_40938_default = "./cinema/person-40938-ISCFA23A.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-24502.jpg
  var person_24502_default = "./cinema/person-24502-PPLQBABZ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/329-poster.jpg
  var poster_default37 = "./cinema/329-poster-IL5PLV3V.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/329-backdrop.jpg
  var backdrop_default37 = "./cinema/329-backdrop-KYK32YOM.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-4783.jpg
  var person_4783_default = "./cinema/person-4783-N74GPKWF.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-4784.jpg
  var person_4784_default = "./cinema/person-4784-76LGGVNA.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-4785.jpg
  var person_4785_default = "./cinema/person-4785-SY5OFVUP.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/85-poster.jpg
  var poster_default38 = "./cinema/85-poster-3XIQZLVN.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/85-backdrop.jpg
  var backdrop_default38 = "./cinema/85-backdrop-ZYVL33IS.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-3.jpg
  var person_3_default = "./cinema/person-3-4Q3R6UUJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-650.jpg
  var person_650_default = "./cinema/person-650-4WBGO7EA.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-652.jpg
  var person_652_default = "./cinema/person-652-HK2ZWAD7.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/330-poster.jpg
  var poster_default39 = "./cinema/330-poster-ZZAYVBYK.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/330-backdrop.jpg
  var backdrop_default39 = "./cinema/330-backdrop-I2AVXEWH.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-1231.jpg
  var person_1231_default = "./cinema/person-1231-Z6HEPGMJ.jpg";

  // ../video-x/design/2026-11-redesign/assets/cinema/person-4935.jpg
  var person_4935_default = "./cinema/person-4935-ZOWUISA5.jpg";

  // ../video-x/design/2026-11-redesign/src/components/generated/cinemaCatalog.ts
  function withAddedDates(items) {
    return items.map((item, index) => ({
      ...item,
      createdAt: new Date(Date.UTC(2026, 10, 18 - index)).toISOString()
    }));
  }
  var films = withAddedDates([
    {
      id: 693134,
      title: "\u6C99\u4E182",
      year: 2024,
      minutes: 166,
      category: "\u79D1\u5E7B",
      summary: "\u4FDD\u7F57\u52A0\u5165\u5384\u62C9\u79D1\u65AF\u7684\u5F17\u96F7\u66FC\u4EBA\uFF0C\u5728\u590D\u4EC7\u4E0E\u672A\u6765\u4E4B\u95F4\u4F5C\u51FA\u9009\u62E9\u3002",
      actors: [1190668, 505710, 933238],
      series: 1,
      image: poster_default,
      backdrop: backdrop_default
    },
    {
      id: 129,
      title: "\u5343\u4E0E\u5343\u5BFB",
      year: 2001,
      minutes: 125,
      category: "\u52A8\u753B",
      summary: "\u5343\u5BFB\u8BEF\u5165\u795E\u7075\u7684\u6D74\u573A\uFF0C\u4E3A\u6551\u56DE\u7236\u6BCD\u7559\u4E0B\u5DE5\u4F5C\u3002",
      actors: [19587, 19588, 19589],
      series: null,
      image: poster_default2,
      backdrop: backdrop_default2
    },
    {
      id: 843,
      title: "\u82B1\u6837\u5E74\u534E",
      year: 2e3,
      minutes: 99,
      category: "\u7231\u60C5",
      summary: "\u516D\u5341\u5E74\u4EE3\u7684\u9999\u6E2F\uFF0C\u4E24\u4F4D\u90BB\u5C45\u5728\u4E00\u6B21\u6B21\u64E6\u80A9\u4E2D\u8D70\u8FD1\u5F7C\u6B64\u3002",
      actors: [1338, 1337, 12674],
      series: null,
      image: poster_default3,
      backdrop: backdrop_default3
    },
    {
      id: 157336,
      title: "\u661F\u9645\u7A7F\u8D8A",
      year: 2014,
      minutes: 169,
      category: "\u79D1\u5E7B",
      summary: "\u4E00\u652F\u63A2\u9669\u961F\u7A7F\u8FC7\u866B\u6D1E\uFF0C\u4E3A\u5730\u7403\u4E0A\u7684\u5BB6\u4EBA\u5BFB\u627E\u65B0\u7684\u5BB6\u56ED\u3002",
      actors: [10297, 1813, 3895],
      series: null,
      image: poster_default4,
      backdrop: backdrop_default4
    },
    {
      id: 120467,
      title: "\u5E03\u8FBE\u4F69\u65AF\u5927\u996D\u5E97",
      year: 2014,
      minutes: 100,
      category: "\u559C\u5267",
      summary: "\u4E00\u540D\u95E8\u7AE5\u8DDF\u968F\u996D\u5E97\u793C\u5BBE\u5458\uFF0C\u5377\u5165\u540D\u753B\u5931\u7A83\u548C\u9057\u4EA7\u4E4B\u4E89\u3002",
      actors: [5469, 1164, 1291350],
      series: null,
      image: poster_default5,
      backdrop: backdrop_default5
    },
    {
      id: 324857,
      title: "\u8718\u86DB\u4FA0\uFF1A\u5E73\u884C\u5B87\u5B99",
      year: 2018,
      minutes: 116,
      category: "\u52A8\u753B",
      summary: "\u5E03\u9C81\u514B\u6797\u5C11\u5E74\u8FC8\u5C14\u65AF\u9047\u5230\u4E86\u6765\u81EA\u5176\u4ED6\u5B87\u5B99\u7684\u8718\u86DB\u4FA0\u3002",
      actors: [587506, 543505, 130640],
      series: 2,
      image: poster_default6,
      backdrop: backdrop_default6
    },
    {
      id: 313369,
      title: "\u7231\u4E50\u4E4B\u57CE",
      year: 2016,
      minutes: 128,
      category: "\u7231\u60C5",
      summary: "\u4E00\u4F4D\u7235\u58EB\u94A2\u7434\u624B\u4E0E\u4E00\u540D\u6F14\u5458\u5728\u6D1B\u6749\u77F6\u8FFD\u9010\u5404\u81EA\u7684\u68A6\u60F3\u3002",
      actors: [30614, 54693, 113461],
      series: null,
      image: poster_default7,
      backdrop: backdrop_default7
    },
    {
      id: 10775,
      title: "\u65E0\u95F4\u9053",
      year: 2002,
      minutes: 97,
      category: "\u72AF\u7F6A",
      summary: "\u8B66\u65B9\u4E0E\u9ED1\u5E2E\u5404\u6709\u4E00\u540D\u5367\u5E95\uFF0C\u4E24\u4EBA\u540C\u65F6\u5F00\u59CB\u8FFD\u67E5\u5BF9\u65B9\u3002",
      actors: [25246, 1337, 66717],
      series: 3,
      image: poster_default8,
      backdrop: backdrop_default8
    },
    {
      id: 10681,
      title: "\u673A\u5668\u4EBA\u603B\u52A8\u5458",
      year: 2008,
      minutes: 98,
      category: "\u52A8\u753B",
      summary: "\u72EC\u81EA\u6E05\u626B\u5730\u7403\u7684\u673A\u5668\u4EBA\uFF0C\u9047\u89C1\u4E86\u6765\u81EA\u592A\u7A7A\u7684\u63A2\u6D4B\u673A\u5668\u4EBA\u3002",
      actors: [670, 72754, 60074],
      series: null,
      image: poster_default9,
      backdrop: backdrop_default9
    },
    {
      id: 329865,
      title: "\u964D\u4E34",
      year: 2016,
      minutes: 116,
      category: "\u79D1\u5E7B",
      summary: "\u795E\u79D8\u98DE\u8239\u964D\u4E34\u5730\u7403\uFF0C\u4E00\u4F4D\u8BED\u8A00\u5B66\u5BB6\u5C1D\u8BD5\u7406\u89E3\u6765\u8BBF\u8005\u7684\u6587\u5B57\u3002",
      actors: [9273, 17604, 2178],
      series: null,
      image: poster_default10,
      backdrop: backdrop_default10
    },
    {
      id: 155,
      title: "\u8759\u8760\u4FA0\uFF1A\u9ED1\u6697\u9A91\u58EB",
      year: 2008,
      minutes: 152,
      category: "\u52A8\u4F5C",
      summary: "\u5C0F\u4E11\u7684\u5230\u6765\u8FEB\u4F7F\u54E5\u8C2D\u5E02\u4E0E\u8759\u8760\u4FA0\u9762\u5BF9\u65B0\u7684\u9009\u62E9\u3002",
      actors: [3894, 1810, 6383],
      series: 4,
      image: poster_default11,
      backdrop: backdrop_default11
    },
    {
      id: 128,
      title: "\u5E7D\u7075\u516C\u4E3B",
      year: 1997,
      minutes: 134,
      category: "\u52A8\u753B",
      summary: "\u4E00\u540D\u5E74\u8F7B\u65C5\u4EBA\u5939\u5728\u68EE\u6797\u8BF8\u795E\u4E0E\u70BC\u94C1\u6751\u5C45\u6C11\u4E4B\u95F4\u3002",
      actors: [622, 20330, 20331],
      series: null,
      image: poster_default12,
      backdrop: backdrop_default12
    },
    {
      id: 76341,
      title: "\u75AF\u72C2\u7684\u9EA6\u514B\u65AF4\uFF1A\u72C2\u66B4\u4E4B\u8DEF",
      year: 2015,
      minutes: 120,
      category: "\u52A8\u4F5C",
      summary: "\u9EA6\u514B\u65AF\u548C\u5F17\u745E\u5965\u8428\u5728\u8352\u6F20\u4E2D\u62A4\u9001\u4E00\u7FA4\u51FA\u9003\u7684\u5973\u5B50\u3002",
      actors: [2524, 6885, 3292],
      series: null,
      image: poster_default13,
      backdrop: backdrop_default13
    },
    {
      id: 746,
      title: "\u672B\u4EE3\u7687\u5E1D",
      year: 1987,
      minutes: 163,
      category: "\u5267\u60C5",
      summary: "\u6EA5\u4EEA\u4ECE\u7D2B\u7981\u57CE\u8D70\u5411\u57CE\u5916\uFF0C\u56DE\u671B\u8EAB\u4EFD\u51E0\u7ECF\u53D8\u8FC1\u7684\u4E00\u751F\u3002",
      actors: [11389, 6720, 11390],
      series: null,
      image: poster_default14,
      backdrop: backdrop_default14
    },
    {
      id: 33320,
      title: "\u5343\u5E74\u5973\u4F18",
      year: 2002,
      minutes: 87,
      category: "\u52A8\u753B",
      summary: "\u4E00\u4F4D\u606F\u5F71\u5973\u6F14\u5458\u63A5\u53D7\u91C7\u8BBF\uFF0C\u5F80\u4E8B\u4E0E\u5979\u6F14\u8FC7\u7684\u89D2\u8272\u6E10\u6E10\u91CD\u53E0\u3002",
      actors: [235332, 1680, 23988],
      series: null,
      image: poster_default15,
      backdrop: backdrop_default15
    },
    {
      id: 838240,
      title: "\u673A\u5668\u4EBA\u4E4B\u68A6",
      year: 2023,
      minutes: 102,
      category: "\u52A8\u753B",
      summary: "\u7EBD\u7EA6\u4E1C\u6751\u7684\u4E00\u53EA\u5C0F\u72D7\u4E3A\u81EA\u5DF1\u7EC4\u88C5\u4E86\u4E00\u4F4D\u673A\u5668\u4EBA\u670B\u53CB\u3002",
      actors: [31415],
      series: null,
      image: poster_default16,
      backdrop: backdrop_default16
    },
    {
      id: 438631,
      title: "\u6C99\u4E18",
      year: 2021,
      minutes: 156,
      category: "\u79D1\u5E7B",
      summary: "\u4FDD\u7F57\u968F\u5BB6\u65CF\u524D\u5F80\u6C99\u6F20\u661F\u7403\uFF0C\u63A5\u7BA1\u9999\u6599\u751F\u4EA7\u7684\u4F7F\u547D\u5371\u673A\u56DB\u4F0F\u3002",
      actors: [1190668, 933238, 25072],
      series: 1,
      image: poster_default17,
      backdrop: backdrop_default17
    },
    {
      id: 808,
      title: "\u602A\u7269\u53F2\u745E\u514B",
      year: 2001,
      minutes: 90,
      category: "\u52A8\u753B",
      summary: "\u4E3A\u53D6\u56DE\u81EA\u5DF1\u7684\u6CBC\u6CFD\uFF0C\u53F2\u745E\u514B\u548C\u9A74\u5B50\u8E0F\u4E0A\u8425\u6551\u516C\u4E3B\u7684\u65C5\u7A0B\u3002",
      actors: [12073, 776, 6941],
      series: null,
      image: poster_default18,
      backdrop: backdrop_default18
    },
    {
      id: 569094,
      title: "\u8718\u86DB\u4FA0\uFF1A\u7EB5\u6A2A\u5B87\u5B99",
      year: 2023,
      minutes: 140,
      category: "\u52A8\u753B",
      summary: "\u8FC8\u5C14\u65AF\u7A7F\u8D8A\u591A\u91CD\u5B87\u5B99\uFF0C\u5728\u8718\u86DB\u4FA0\u8054\u76DF\u4E2D\u5BFB\u627E\u81EA\u5DF1\u7684\u7B54\u6848\u3002",
      actors: [587506, 130640, 25072],
      series: 2,
      image: poster_default19,
      backdrop: backdrop_default19
    },
    {
      id: 496243,
      title: "\u5BC4\u751F\u866B",
      year: 2019,
      minutes: 132,
      category: "\u5267\u60C5",
      summary: "\u4E24\u6237\u4EBA\u5BB6\u56E0\u4E00\u4EFD\u5BB6\u6559\u5DE5\u4F5C\u76F8\u9047\uFF0C\u751F\u6D3B\u9010\u6E10\u4EA4\u7EC7\u3002",
      actors: [20738, 115290, 556435],
      series: null,
      image: poster_default20,
      backdrop: backdrop_default20
    },
    {
      id: 269149,
      title: "\u75AF\u72C2\u52A8\u7269\u57CE",
      year: 2016,
      minutes: 109,
      category: "\u52A8\u753B",
      summary: "\u5154\u5B50\u8B66\u5B98\u6731\u8FEA\u4E0E\u72D0\u72F8\u5C3C\u514B\u5408\u4F5C\u8C03\u67E5\u52A8\u7269\u5931\u8E2A\u6848\u3002",
      actors: [417, 23532, 17605],
      series: null,
      image: poster_default21,
      backdrop: backdrop_default21
    },
    {
      id: 272,
      title: "\u8759\u8760\u4FA0\uFF1A\u4FA0\u5F71\u4E4B\u8C1C",
      year: 2005,
      minutes: 140,
      category: "\u52A8\u4F5C",
      summary: "\u5E03\u9C81\u65AF\xB7\u97E6\u6069\u91CD\u8FD4\u54E5\u8C2D\uFF0C\u51B3\u5B9A\u7528\u53E6\u4E00\u91CD\u8EAB\u4EFD\u5B88\u62A4\u57CE\u5E02\u3002",
      actors: [3894, 3895, 3896],
      series: 4,
      image: poster_default22,
      backdrop: backdrop_default22
    },
    {
      id: 49026,
      title: "\u8759\u8760\u4FA0\uFF1A\u9ED1\u6697\u9A91\u58EB\u5D1B\u8D77",
      year: 2012,
      minutes: 165,
      category: "\u52A8\u4F5C",
      summary: "\u9690\u9000\u591A\u5E74\u7684\u5E03\u9C81\u65AF\u5FC5\u987B\u56DE\u5230\u88AB\u8D1D\u6069\u56F4\u56F0\u7684\u54E5\u8C2D\u3002",
      actors: [3894, 64, 2524],
      series: 4,
      image: poster_default23,
      backdrop: backdrop_default23
    },
    {
      id: 10997,
      title: "\u9738\u738B\u522B\u59EC",
      year: 1993,
      minutes: 171,
      category: "\u5267\u60C5",
      summary: "\u4E24\u4F4D\u4EAC\u5267\u6F14\u5458\u4ECE\u5C11\u5E74\u5531\u5230\u4E2D\u5E74\uFF0C\u53F0\u4E0A\u7684\u5173\u7CFB\u5EF6\u4F38\u5230\u53F0\u4E0B\u3002",
      actors: [69637, 65277, 643],
      series: null,
      image: poster_default24,
      backdrop: backdrop_default24
    },
    {
      id: 146,
      title: "\u5367\u864E\u85CF\u9F99",
      year: 2e3,
      minutes: 120,
      category: "\u52A8\u4F5C",
      summary: "\u4E00\u67C4\u5931\u7A83\u7684\u9752\u51A5\u5251\uFF0C\u628A\u51E0\u4F4D\u6C5F\u6E56\u4EBA\u7684\u547D\u8FD0\u8FDE\u5728\u4E00\u8D77\u3002",
      actors: [1619, 1620, 1339],
      series: null,
      image: poster_default25,
      backdrop: backdrop_default25
    },
    {
      id: 9470,
      title: "\u529F\u592B",
      year: 2004,
      minutes: 99,
      category: "\u559C\u5267",
      summary: "\u963F\u661F\u4E00\u5FC3\u60F3\u52A0\u5165\u65A7\u5934\u5E2E\uFF0C\u5374\u95EF\u8FDB\u4E86\u85CF\u9F99\u5367\u864E\u7684\u732A\u7B3C\u57CE\u5BE8\u3002",
      actors: [57607, 119426, 57609],
      series: null,
      image: poster_default26,
      backdrop: backdrop_default26
    },
    {
      id: 150540,
      title: "\u5934\u8111\u7279\u5DE5\u961F",
      year: 2015,
      minutes: 95,
      category: "\u52A8\u753B",
      summary: "\u642C\u5BB6\u6253\u4E71\u83B1\u8389\u7684\u751F\u6D3B\uFF0C\u8111\u6D77\u91CC\u7684\u51E0\u79CD\u60C5\u7EEA\u4E5F\u9677\u5165\u6DF7\u4E71\u3002",
      actors: [56322, 169200, 21125],
      series: 5,
      image: poster_default27,
      backdrop: backdrop_default27
    },
    {
      id: 1022789,
      title: "\u5934\u8111\u7279\u5DE5\u961F2",
      year: 2024,
      minutes: 96,
      category: "\u52A8\u753B",
      summary: "\u9752\u6625\u671F\u5E26\u6765\u4E86\u65B0\u7684\u60C5\u7EEA\uFF0C\u83B1\u8389\u7684\u5185\u5FC3\u4E16\u754C\u9762\u4E34\u4EA4\u63A5\u3002",
      actors: [56322, 1903874, 3020876],
      series: 5,
      image: poster_default28,
      backdrop: backdrop_default28
    },
    {
      id: 19995,
      title: "\u963F\u51E1\u8FBE",
      year: 2009,
      minutes: 162,
      category: "\u79D1\u5E7B",
      summary: "\u6770\u514B\u4EE5\u963F\u51E1\u8FBE\u7684\u8EAB\u4EFD\u8FDB\u5165\u6F58\u591A\u62C9\u7684\u68EE\u6797\uFF0C\u9010\u6E10\u878D\u5165\u7EB3\u7F8E\u4EBA\u7684\u751F\u6D3B\u3002",
      actors: [65731, 8691, 10205],
      series: 6,
      image: poster_default29,
      backdrop: backdrop_default29
    },
    {
      id: 76600,
      title: "\u963F\u51E1\u8FBE\uFF1A\u6C34\u4E4B\u9053",
      year: 2022,
      minutes: 193,
      category: "\u79D1\u5E7B",
      summary: "\u6770\u514B\u4E00\u5BB6\u79BB\u5F00\u68EE\u6797\uFF0C\u5728\u6F58\u591A\u62C9\u7684\u6D77\u6D0B\u90E8\u65CF\u4E2D\u5BFB\u627E\u5E87\u62A4\u3002",
      actors: [65731, 8691, 10205],
      series: 6,
      image: poster_default30,
      backdrop: backdrop_default30
    },
    {
      id: 582,
      title: "\u7A83\u542C\u98CE\u66B4",
      year: 2006,
      minutes: 137,
      category: "\u5267\u60C5",
      summary: "\u4E00\u540D\u4E1C\u5FB7\u79D8\u5BC6\u8B66\u5BDF\u76D1\u542C\u5267\u4F5C\u5BB6\u592B\u5987\uFF0C\u81EA\u5DF1\u7684\u751F\u6D3B\u4E5F\u968F\u4E4B\u6539\u53D8\u3002",
      actors: [678, 8196, 8197],
      series: null,
      image: poster_default31,
      backdrop: backdrop_default31
    },
    {
      id: 354912,
      title: "\u5BFB\u68A6\u73AF\u6E38\u8BB0",
      year: 2017,
      minutes: 105,
      category: "\u52A8\u753B",
      summary: "\u70ED\u7231\u5409\u4ED6\u7684\u7C73\u683C\u5728\u4EA1\u7075\u8282\u8E0F\u4E0A\u4E00\u8D9F\u5BFB\u627E\u5BB6\u65CF\u5F80\u4E8B\u7684\u65C5\u7A0B\u3002",
      actors: [1193391, 258, 4589],
      series: null,
      image: poster_default32,
      backdrop: backdrop_default32
    },
    {
      id: 1213,
      title: "\u5929\u624D\u745E\u666E\u5229",
      year: 1999,
      minutes: 140,
      category: "\u72AF\u7F6A",
      summary: "\u6C64\u59C6\u53D7\u6258\u524D\u5F80\u610F\u5927\u5229\u529D\u4E00\u4F4D\u5BCC\u5BB6\u5B50\u8FD4\u4E61\uFF0C\u9010\u6E10\u8FF7\u4E0A\u5BF9\u65B9\u7684\u751F\u6D3B\u548C\u8EAB\u4EFD\u3002",
      actors: [1892, 12052, 9642],
      series: null,
      image: poster_default33,
      backdrop: backdrop_default33
    },
    {
      id: 13398,
      title: "\u4E1C\u4EAC\u6559\u7236",
      year: 2003,
      minutes: 92,
      category: "\u52A8\u753B",
      summary: "\u4E1C\u4EAC\u8857\u5934\u7684\u4E09\u4F4D\u4F19\u4F34\u5728\u5723\u8BDE\u591C\u53D1\u73B0\u4E00\u540D\u5F03\u5A74\uFF0C\u51B3\u5B9A\u5E26\u7740\u5979\u5BFB\u627E\u5BB6\u4EBA\u3002",
      actors: [117626, 117629, 40330],
      series: null,
      image: poster_default34,
      backdrop: backdrop_default34
    },
    {
      id: 515042,
      title: "\u5F92\u624B\u6500\u5CA9",
      year: 2018,
      minutes: 100,
      category: "\u7EAA\u5F55\u7247",
      summary: "\u4E9A\u5386\u514B\u65AF\xB7\u970D\u8BFA\u5FB7\u51C6\u5907\u5728\u6CA1\u6709\u7EF3\u7D22\u4FDD\u62A4\u7684\u60C5\u51B5\u4E0B\uFF0C\u6500\u767B\u4F18\u80DC\u7F8E\u5730\u7684\u914B\u957F\u5CA9\u3002",
      actors: [107800, 107798, 1403129],
      series: null,
      image: poster_default35,
      backdrop: backdrop_default35
    },
    {
      id: 1667,
      title: "\u5E1D\u4F01\u9E45\u65E5\u8BB0",
      year: 2005,
      minutes: 80,
      category: "\u7EAA\u5F55\u7247",
      summary: "\u6BCF\u5E74\u4E25\u51AC\uFF0C\u5E1D\u4F01\u9E45\u79BB\u5F00\u6D77\u6D0B\uFF0C\u7A7F\u8FC7\u5357\u6781\u51B0\u539F\u5BFB\u627E\u7E41\u6B96\u5730\u3002",
      actors: [48576, 40938, 24502],
      series: null,
      image: poster_default36,
      backdrop: backdrop_default36
    },
    {
      id: 329,
      title: "\u4F8F\u7F57\u7EAA\u516C\u56ED",
      year: 1993,
      minutes: 127,
      category: "\u5192\u9669",
      summary: "\u79D1\u5B66\u5BB6\u53D7\u9080\u53C2\u89C2\u4E00\u5EA7\u6050\u9F99\u4E3B\u9898\u516C\u56ED\uFF0C\u56ED\u533A\u7684\u5B89\u4FDD\u7CFB\u7EDF\u5374\u7A81\u7136\u5931\u6548\u3002",
      actors: [4783, 4784, 4785],
      series: 7,
      image: poster_default37,
      backdrop: backdrop_default37
    },
    {
      id: 85,
      title: "\u593A\u5B9D\u5947\u5175\uFF1A\u6CD5\u67DC\u5947\u5175",
      year: 1981,
      minutes: 115,
      category: "\u5192\u9669",
      summary: "\u8003\u53E4\u5B66\u5BB6\u5370\u7B2C\u5B89\u7EB3\xB7\u743C\u65AF\u8E0F\u4E0A\u5BFB\u627E\u7EA6\u67DC\u7684\u65C5\u7A0B\u3002",
      actors: [3, 650, 652],
      series: null,
      image: poster_default38,
      backdrop: backdrop_default38
    },
    {
      id: 330,
      title: "\u4F8F\u7F57\u7EAA\u516C\u56ED2\uFF1A\u5931\u843D\u7684\u4E16\u754C",
      year: 1997,
      minutes: 129,
      category: "\u5192\u9669",
      summary: "\u4E00\u652F\u5C0F\u961F\u91CD\u8FD4\u6050\u9F99\u6816\u606F\u7684\u5C9B\u5C7F\uFF0C\u53D1\u73B0\u53E6\u6709\u4EBA\u6253\u7B97\u628A\u6050\u9F99\u8FD0\u79BB\u90A3\u91CC\u3002",
      actors: [4785, 1231, 4935],
      series: 7,
      image: poster_default39,
      backdrop: backdrop_default39
    }
  ]);
  var people = withAddedDates([
    {
      id: 1190668,
      name: "\u63D0\u83AB\u897F\xB7\u67E5\u62C9\u6885",
      category: "\u79D1\u5E7B",
      detailed: "\u63D0\u83AB\u897F\xB7\u67E5\u62C9\u6885",
      image: person_1190668_default
    },
    {
      id: 505710,
      name: "\u8D5E\u8FBE\u4E9A\xB7\u79D1\u5C14\u66FC",
      category: "\u79D1\u5E7B",
      detailed: "\u8D5E\u8FBE\u4E9A\xB7\u79D1\u5C14\u66FC",
      image: person_505710_default
    },
    {
      id: 933238,
      name: "\u4E3D\u8D1D\u5361\xB7\u5F17\u683C\u68EE",
      category: "\u79D1\u5E7B",
      detailed: "\u4E3D\u8D1D\u5361\xB7\u5F17\u683C\u68EE",
      image: person_933238_default
    },
    {
      id: 19587,
      name: "\u67CA\u7460\u7F8E",
      category: "\u52A8\u753B",
      detailed: "\u67CA\u7460\u7F8E",
      image: person_19587_default
    },
    {
      id: 19588,
      name: "\u5165\u91CE\u81EA\u7531",
      category: "\u52A8\u753B",
      detailed: "\u5165\u91CE\u81EA\u7531",
      image: person_19588_default
    },
    {
      id: 19589,
      name: "\u590F\u6728\u771F\u7406",
      category: "\u52A8\u753B",
      detailed: "\u590F\u6728\u771F\u7406",
      image: person_19589_default
    },
    {
      id: 1338,
      name: "\u5F20\u66FC\u7389",
      category: "\u7231\u60C5",
      detailed: "\u5F20\u66FC\u7389",
      image: person_1338_default
    },
    {
      id: 1337,
      name: "\u6881\u671D\u4F1F",
      category: "\u7231\u60C5",
      detailed: "\u6881\u671D\u4F1F",
      image: person_1337_default
    },
    {
      id: 12674,
      name: "\u8427\u70B3\u6797",
      category: "\u7231\u60C5",
      detailed: "\u8427\u70B3\u6797",
      image: person_12674_default
    },
    {
      id: 10297,
      name: "\u9A6C\u4FEE\xB7\u9EA6\u5EB7\u7EB3",
      category: "\u79D1\u5E7B",
      detailed: "\u9A6C\u4FEE\xB7\u9EA6\u5EB7\u7EB3",
      image: person_10297_default
    },
    {
      id: 1813,
      name: "\u5B89\u59AE\xB7\u6D77\u745F\u8587",
      category: "\u79D1\u5E7B",
      detailed: "\u5B89\u59AE\xB7\u6D77\u745F\u8587",
      image: person_1813_default
    },
    {
      id: 3895,
      name: "\u8FC8\u514B\u5C14\xB7\u51EF\u6069",
      category: "\u79D1\u5E7B",
      detailed: "\u8FC8\u514B\u5C14\xB7\u51EF\u6069",
      image: person_3895_default
    },
    {
      id: 5469,
      name: "\u62C9\u5C14\u592B\xB7\u8D39\u56E0\u65AF",
      category: "\u559C\u5267",
      detailed: "\u62C9\u5C14\u592B\xB7\u8D39\u56E0\u65AF",
      image: person_5469_default
    },
    {
      id: 1164,
      name: "F\xB7\u9ED8\u91CC\xB7\u4E9A\u4F2F\u62C9\u7F55",
      category: "\u559C\u5267",
      detailed: "F\xB7\u9ED8\u91CC\xB7\u4E9A\u4F2F\u62C9\u7F55",
      image: person_1164_default
    },
    {
      id: 1291350,
      name: "\u6258\u5C3C\xB7\u96F7\u6C83\u7F57\u5229",
      category: "\u559C\u5267",
      detailed: "\u6258\u5C3C\xB7\u96F7\u6C83\u7F57\u5229",
      image: person_1291350_default
    },
    {
      id: 587506,
      name: "\u6C99\u6885\u514B\xB7\u6469\u5C14",
      category: "\u52A8\u753B",
      detailed: "\u6C99\u6885\u514B\xB7\u6469\u5C14",
      image: person_587506_default
    },
    {
      id: 543505,
      name: "\u6770\u514B\xB7\u7EA6\u7FF0\u900A",
      category: "\u52A8\u753B",
      detailed: "\u6770\u514B\xB7\u7EA6\u7FF0\u900A",
      image: person_543505_default
    },
    {
      id: 130640,
      name: "\u6D77\u8389\xB7\u65AF\u5766\u83F2\u5C14\u5FB7",
      category: "\u52A8\u753B",
      detailed: "\u6D77\u8389\xB7\u65AF\u5766\u83F2\u5C14\u5FB7",
      image: person_130640_default
    },
    {
      id: 30614,
      name: "\u745E\u6069\xB7\u9AD8\u65AF\u6797",
      category: "\u7231\u60C5",
      detailed: "\u745E\u6069\xB7\u9AD8\u65AF\u6797",
      image: person_30614_default
    },
    {
      id: 54693,
      name: "\u827E\u739B\xB7\u65AF\u901A",
      category: "\u7231\u60C5",
      detailed: "\u827E\u739B\xB7\u65AF\u901A",
      image: person_54693_default
    },
    {
      id: 113461,
      name: "\u7EA6\u7FF0\u2022\u4F20\u5947",
      category: "\u7231\u60C5",
      detailed: "\u7EA6\u7FF0\u2022\u4F20\u5947",
      image: person_113461_default
    },
    {
      id: 25246,
      name: "\u5218\u5FB7\u534E",
      category: "\u72AF\u7F6A",
      detailed: "\u5218\u5FB7\u534E",
      image: person_25246_default
    },
    {
      id: 66717,
      name: "\u9EC4\u79CB\u751F",
      category: "\u72AF\u7F6A",
      detailed: "\u9EC4\u79CB\u751F",
      image: person_66717_default
    },
    {
      id: 670,
      name: "\u672C\xB7\u8D1D\u5C14\u7279",
      category: "\u52A8\u753B",
      detailed: "\u672C\xB7\u8D1D\u5C14\u7279",
      image: person_670_default
    },
    {
      id: 72754,
      name: "\u827E\u4E3D\u838E\xB7\u5948\u7279",
      category: "\u52A8\u753B",
      detailed: "\u827E\u4E3D\u838E\xB7\u5948\u7279",
      image: person_72754_default
    },
    {
      id: 60074,
      name: "\u6770\u592B\xB7\u683C\u5C14\u6797",
      category: "\u52A8\u753B",
      detailed: "\u6770\u592B\xB7\u683C\u5C14\u6797",
      image: person_60074_default
    },
    {
      id: 9273,
      name: "\u827E\u7C73\xB7\u4E9A\u5F53\u65AF",
      category: "\u79D1\u5E7B",
      detailed: "\u827E\u7C73\xB7\u4E9A\u5F53\u65AF",
      image: person_9273_default
    },
    {
      id: 17604,
      name: "\u6770\u745E\u7C73\xB7\u96F7\u7EB3",
      category: "\u79D1\u5E7B",
      detailed: "\u6770\u745E\u7C73\xB7\u96F7\u7EB3",
      image: person_17604_default
    },
    {
      id: 2178,
      name: "\u798F\u91CC\u65AF\u7279\xB7\u60E0\u7279\u514B",
      category: "\u79D1\u5E7B",
      detailed: "\u798F\u91CC\u65AF\u7279\xB7\u60E0\u7279\u514B",
      image: person_2178_default
    },
    {
      id: 3894,
      name: "\u514B\u91CC\u65AF\u8482\u5B89\xB7\u8D1D\u5C14",
      category: "\u52A8\u4F5C",
      detailed: "\u514B\u91CC\u65AF\u8482\u5B89\xB7\u8D1D\u5C14",
      image: person_3894_default
    },
    {
      id: 1810,
      name: "\u5E0C\u65AF\xB7\u83B1\u6770",
      category: "\u52A8\u4F5C",
      detailed: "\u5E0C\u65AF\xB7\u83B1\u6770",
      image: person_1810_default
    },
    {
      id: 6383,
      name: "\u827E\u4F26\xB7\u827E\u514B\u54C8\u7279",
      category: "\u52A8\u4F5C",
      detailed: "\u827E\u4F26\xB7\u827E\u514B\u54C8\u7279",
      image: person_6383_default
    },
    {
      id: 622,
      name: "\u677E\u7530\u6D0B\u6CBB",
      category: "\u52A8\u753B",
      detailed: "\u677E\u7530\u6D0B\u6CBB",
      image: person_622_default
    },
    {
      id: 20330,
      name: "\u77F3\u7530\u767E\u5408\u5B50",
      category: "\u52A8\u753B",
      detailed: "\u77F3\u7530\u767E\u5408\u5B50",
      image: person_20330_default
    },
    {
      id: 20331,
      name: "\u7530\u4E2D\u88D5\u5B50",
      category: "\u52A8\u753B",
      detailed: "\u7530\u4E2D\u88D5\u5B50",
      image: person_20331_default
    },
    {
      id: 2524,
      name: "\u6C64\u59C6\xB7\u54C8\u8FEA",
      category: "\u52A8\u4F5C",
      detailed: "\u6C64\u59C6\xB7\u54C8\u8FEA",
      image: person_2524_default
    },
    {
      id: 6885,
      name: "\u67E5\u7406\u5179\xB7\u585E\u9686",
      category: "\u52A8\u4F5C",
      detailed: "\u67E5\u7406\u5179\xB7\u585E\u9686",
      image: person_6885_default
    },
    {
      id: 3292,
      name: "\u5C3C\u53E4\u62C9\u65AF\xB7\u970D\u5C14\u7279",
      category: "\u52A8\u4F5C",
      detailed: "\u5C3C\u53E4\u62C9\u65AF\xB7\u970D\u5C14\u7279",
      image: person_3292_default
    },
    {
      id: 11389,
      name: "\u5C0A\u9F99",
      category: "\u5267\u60C5",
      detailed: "\u5C0A\u9F99",
      image: person_11389_default
    },
    {
      id: 6720,
      name: "\u9648\u51B2",
      category: "\u5267\u60C5",
      detailed: "\u9648\u51B2",
      image: person_6720_default
    },
    {
      id: 11390,
      name: "\u5F7C\u5F97\xB7\u5965\u56FE\u5C14",
      category: "\u5267\u60C5",
      detailed: "\u5F7C\u5F97\xB7\u5965\u56FE\u5C14",
      image: person_11390_default
    },
    {
      id: 235332,
      name: "\u5E84\u53F8\u7F8E\u4EE3\u5B50",
      category: "\u52A8\u753B",
      detailed: "\u5E84\u53F8\u7F8E\u4EE3\u5B50",
      image: person_235332_default
    },
    {
      id: 1680,
      name: "\u5C0F\u5C71\u8309\u7F8E",
      category: "\u52A8\u753B",
      detailed: "\u5C0F\u5C71\u8309\u7F8E",
      image: person_1680_default
    },
    {
      id: 23988,
      name: "\u6298\u7B20\u5BCC\u7F8E\u5B50",
      category: "\u52A8\u753B",
      detailed: "\u6298\u7B20\u5BCC\u7F8E\u5B50",
      image: person_23988_default
    },
    {
      id: 31415,
      name: "\u4F0A\u4E07\xB7\u62C9\u73ED\u8FBE",
      category: "\u52A8\u753B",
      detailed: "\u4F0A\u4E07\xB7\u62C9\u73ED\u8FBE",
      image: person_31415_default
    },
    {
      id: 25072,
      name: "\u5965\u65AF\u5361\xB7\u4F0A\u8428\u514B",
      category: "\u79D1\u5E7B",
      detailed: "\u5965\u65AF\u5361\xB7\u4F0A\u8428\u514B",
      image: person_25072_default
    },
    {
      id: 12073,
      name: "\u9EA6\u514B\xB7\u6885\u5C14\u65AF",
      category: "\u52A8\u753B",
      detailed: "\u9EA6\u514B\xB7\u6885\u5C14\u65AF",
      image: person_12073_default
    },
    {
      id: 776,
      name: "\u827E\u8FEA\xB7\u58A8\u83F2",
      category: "\u52A8\u753B",
      detailed: "\u827E\u8FEA\xB7\u58A8\u83F2",
      image: person_776_default
    },
    {
      id: 6941,
      name: "\u5361\u6885\u9686\xB7\u8FEA\u4E9A\u5179",
      category: "\u52A8\u753B",
      detailed: "\u5361\u6885\u9686\xB7\u8FEA\u4E9A\u5179",
      image: person_6941_default
    },
    {
      id: 20738,
      name: "\u5B8B\u5EB7\u660A",
      category: "\u5267\u60C5",
      detailed: "\u5B8B\u5EB7\u660A",
      image: person_20738_default
    },
    {
      id: 115290,
      name: "\u674E\u5584\u5747",
      category: "\u5267\u60C5",
      detailed: "\u674E\u5584\u5747",
      image: person_115290_default
    },
    {
      id: 556435,
      name: "\u66F9\u6C5D\u8D1E",
      category: "\u5267\u60C5",
      detailed: "\u66F9\u6C5D\u8D1E",
      image: person_556435_default
    },
    {
      id: 417,
      name: "\u8A79\u59AE\u5F17\xB7\u53E4\u5FB7\u6E29",
      category: "\u52A8\u753B",
      detailed: "\u8A79\u59AE\u5F17\xB7\u53E4\u5FB7\u6E29",
      image: person_417_default
    },
    {
      id: 23532,
      name: "\u6770\u68EE\xB7\u8D1D\u7279\u66FC",
      category: "\u52A8\u753B",
      detailed: "\u6770\u68EE\xB7\u8D1D\u7279\u66FC",
      image: person_23532_default
    },
    {
      id: 17605,
      name: "\u4F0A\u5FB7\u745E\u65AF\xB7\u827E\u5C14\u5DF4",
      category: "\u52A8\u753B",
      detailed: "\u4F0A\u5FB7\u745E\u65AF\xB7\u827E\u5C14\u5DF4",
      image: person_17605_default
    },
    {
      id: 3896,
      name: "\u8FDE\u59C6\xB7\u5C3C\u68EE",
      category: "\u52A8\u4F5C",
      detailed: "\u8FDE\u59C6\xB7\u5C3C\u68EE",
      image: person_3896_default
    },
    {
      id: 64,
      name: "\u52A0\u91CC\xB7\u5965\u5FB7\u66FC",
      category: "\u52A8\u4F5C",
      detailed: "\u52A0\u91CC\xB7\u5965\u5FB7\u66FC",
      image: person_64_default
    },
    {
      id: 69637,
      name: "\u5F20\u56FD\u8363",
      category: "\u5267\u60C5",
      detailed: "\u5F20\u56FD\u8363",
      image: person_69637_default
    },
    {
      id: 65277,
      name: "\u5F20\u4E30\u6BC5",
      category: "\u5267\u60C5",
      detailed: "\u5F20\u4E30\u6BC5",
      image: person_65277_default
    },
    {
      id: 643,
      name: "\u5DE9\u4FD0",
      category: "\u5267\u60C5",
      detailed: "\u5DE9\u4FD0",
      image: person_643_default
    },
    {
      id: 1619,
      name: "\u5468\u6DA6\u53D1",
      category: "\u52A8\u4F5C",
      detailed: "\u5468\u6DA6\u53D1",
      image: person_1619_default
    },
    {
      id: 1620,
      name: "\u6768\u7D2B\u743C",
      category: "\u52A8\u4F5C",
      detailed: "\u6768\u7D2B\u743C",
      image: person_1620_default
    },
    {
      id: 1339,
      name: "\u7AE0\u5B50\u6021",
      category: "\u52A8\u4F5C",
      detailed: "\u7AE0\u5B50\u6021",
      image: person_1339_default
    },
    {
      id: 57607,
      name: "\u5468\u661F\u9A70",
      category: "\u559C\u5267",
      detailed: "\u5468\u661F\u9A70",
      image: person_57607_default
    },
    {
      id: 119426,
      name: "\u5143\u79CB",
      category: "\u559C\u5267",
      detailed: "\u5143\u79CB",
      image: person_119426_default
    },
    {
      id: 57609,
      name: "\u5143\u534E",
      category: "\u559C\u5267",
      detailed: "\u5143\u534E",
      image: person_57609_default
    },
    {
      id: 56322,
      name: "\u827E\u7C73\xB7\u6CE2\u52D2",
      category: "\u52A8\u753B",
      detailed: "\u827E\u7C73\xB7\u6CE2\u52D2",
      image: person_56322_default
    },
    {
      id: 169200,
      name: "\u83F2\u5229\u65AF\xB7\u53F2\u5BC6\u65AF",
      category: "\u52A8\u753B",
      detailed: "\u83F2\u5229\u65AF\xB7\u53F2\u5BC6\u65AF",
      image: person_169200_default
    },
    {
      id: 21125,
      name: "\u7406\u67E5\u5FB7\xB7\u91D1\u5FB7",
      category: "\u52A8\u753B",
      detailed: "\u7406\u67E5\u5FB7\xB7\u91D1\u5FB7",
      image: person_21125_default
    },
    {
      id: 1903874,
      name: "\u739B\u96C5\xB7\u970D\u514B",
      category: "\u52A8\u753B",
      detailed: "\u739B\u96C5\xB7\u970D\u514B",
      image: person_1903874_default
    },
    {
      id: 3020876,
      name: "\u80AF\u8F9B\u987F\xB7\u5854\u5C14\u66FC",
      category: "\u52A8\u753B",
      detailed: "\u80AF\u8F9B\u987F\xB7\u5854\u5C14\u66FC",
      image: person_3020876_default
    },
    {
      id: 65731,
      name: "\u8428\u59C6\xB7\u6C83\u8F9B\u987F",
      category: "\u79D1\u5E7B",
      detailed: "\u8428\u59C6\xB7\u6C83\u8F9B\u987F",
      image: person_65731_default
    },
    {
      id: 8691,
      name: "\u4F50\u4F0A\xB7\u7D22\u5C14\u8FBE\u5A1C",
      category: "\u79D1\u5E7B",
      detailed: "\u4F50\u4F0A\xB7\u7D22\u5C14\u8FBE\u5A1C",
      image: person_8691_default
    },
    {
      id: 10205,
      name: "\u897F\u683C\u59AE\xB7\u97E6\u5F17",
      category: "\u79D1\u5E7B",
      detailed: "\u897F\u683C\u59AE\xB7\u97E6\u5F17",
      image: person_10205_default
    },
    {
      id: 678,
      name: "\u739B\u8482\u5A1C\xB7\u6208\u9EDB\u7279",
      category: "\u5267\u60C5",
      detailed: "\u739B\u8482\u5A1C\xB7\u6208\u9EDB\u7279",
      image: person_678_default
    },
    {
      id: 8196,
      name: "\u4E4C\u5C14\u91CC\u5E0C\xB7\u7A46\u57C3",
      category: "\u5267\u60C5",
      detailed: "\u4E4C\u5C14\u91CC\u5E0C\xB7\u7A46\u57C3",
      image: person_8196_default
    },
    {
      id: 8197,
      name: "\u585E\u5DF4\u65AF\u8482\u5B89\xB7\u79D1\u8D6B",
      category: "\u5267\u60C5",
      detailed: "\u585E\u5DF4\u65AF\u8482\u5B89\xB7\u79D1\u8D6B",
      image: person_8197_default
    },
    {
      id: 1193391,
      name: "\u5B89\u4E1C\u5C3C\xB7\u5188\u8428\u96F7\u65AF",
      category: "\u52A8\u753B",
      detailed: "\u5B89\u4E1C\u5C3C\xB7\u5188\u8428\u96F7\u65AF",
      image: person_1193391_default
    },
    {
      id: 258,
      name: "\u76D6\u5C14\xB7\u52A0\u897F\u4E9A\xB7\u4F2F\u7EB3\u5C14",
      category: "\u52A8\u753B",
      detailed: "\u76D6\u5C14\xB7\u52A0\u897F\u4E9A\xB7\u4F2F\u7EB3\u5C14",
      image: person_258_default
    },
    {
      id: 4589,
      name: "\u672C\u6770\u660E\xB7\u5E03\u62C9\u7279",
      category: "\u52A8\u753B",
      detailed: "\u672C\u6770\u660E\xB7\u5E03\u62C9\u7279",
      image: person_4589_default
    },
    {
      id: 1892,
      name: "\u9A6C\u7279\xB7\u8FBE\u8499",
      category: "\u72AF\u7F6A",
      detailed: "\u9A6C\u7279\xB7\u8FBE\u8499",
      image: person_1892_default
    },
    {
      id: 12052,
      name: "\u683C\u6E29\u59AE\u65AF\xB7\u5E15\u7279\u6D1B",
      category: "\u72AF\u7F6A",
      detailed: "\u683C\u6E29\u59AE\u65AF\xB7\u5E15\u7279\u6D1B",
      image: person_12052_default
    },
    {
      id: 9642,
      name: "\u88D8\u5FB7\xB7\u6D1B",
      category: "\u72AF\u7F6A",
      detailed: "\u88D8\u5FB7\xB7\u6D1B",
      image: person_9642_default
    },
    {
      id: 117626,
      name: "\u5188\u672C\u7EEB",
      category: "\u52A8\u753B",
      detailed: "\u5188\u672C\u7EEB",
      image: person_117626_default
    },
    {
      id: 117629,
      name: "\u6885\u57A3\u4E49\u660E",
      category: "\u52A8\u753B",
      detailed: "\u6885\u57A3\u4E49\u660E",
      image: person_117629_default
    },
    {
      id: 40330,
      name: "\u6C5F\u5B88\u5F7B",
      category: "\u52A8\u753B",
      detailed: "\u6C5F\u5B88\u5F7B",
      image: person_40330_default
    },
    {
      id: 107800,
      name: "\u4E9A\u5386\u514B\u65AF\xB7\u970D\u8BFA\u5FB7",
      category: "\u7EAA\u5F55\u7247",
      detailed: "\u4E9A\u5386\u514B\u65AF\xB7\u970D\u8BFA\u5FB7",
      image: person_107800_default
    },
    {
      id: 107798,
      name: "\u6C64\u7C73\xB7\u8003\u5FB7\u5A01\u5C14",
      category: "\u7EAA\u5F55\u7247",
      detailed: "\u6C64\u7C73\xB7\u8003\u5FB7\u5A01\u5C14",
      image: person_107798_default
    },
    {
      id: 1403129,
      name: "\u91D1\u56FD\u5A01",
      category: "\u7EAA\u5F55\u7247",
      detailed: "\u91D1\u56FD\u5A01",
      image: person_1403129_default
    },
    {
      id: 48576,
      name: "Charles Berling",
      category: "\u7EAA\u5F55\u7247",
      detailed: "Charles Berling",
      image: person_48576_default
    },
    {
      id: 40938,
      name: "Romane Bohringer",
      category: "\u7EAA\u5F55\u7247",
      detailed: "Romane Bohringer",
      image: person_40938_default
    },
    {
      id: 24502,
      name: "Jules Sitruk",
      category: "\u7EAA\u5F55\u7247",
      detailed: "Jules Sitruk",
      image: person_24502_default
    },
    {
      id: 4783,
      name: "\u5C71\u59C6\xB7\u5C3C\u5C14",
      category: "\u5192\u9669",
      detailed: "\u5C71\u59C6\xB7\u5C3C\u5C14",
      image: person_4783_default
    },
    {
      id: 4784,
      name: "\u52B3\u62C9\xB7\u9093\u6069",
      category: "\u5192\u9669",
      detailed: "\u52B3\u62C9\xB7\u9093\u6069",
      image: person_4784_default
    },
    {
      id: 4785,
      name: "\u6770\u592B\xB7\u9AD8\u5E03\u4F26",
      category: "\u5192\u9669",
      detailed: "\u6770\u592B\xB7\u9AD8\u5E03\u4F26",
      image: person_4785_default
    },
    {
      id: 3,
      name: "\u54C8\u91CC\u68EE\xB7\u798F\u7279",
      category: "\u5192\u9669",
      detailed: "\u54C8\u91CC\u68EE\xB7\u798F\u7279",
      image: person_3_default
    },
    {
      id: 650,
      name: "\u51EF\u4F26\xB7\u963F\u5170",
      category: "\u5192\u9669",
      detailed: "\u51EF\u4F26\xB7\u963F\u5170",
      image: person_650_default
    },
    {
      id: 652,
      name: "\u4FDD\u7F57\xB7\u5F17\u91CC\u66FC",
      category: "\u5192\u9669",
      detailed: "\u4FDD\u7F57\xB7\u5F17\u91CC\u66FC",
      image: person_652_default
    },
    {
      id: 1231,
      name: "\u6731\u4E3D\u5B89\xB7\u6469\u5C14",
      category: "\u5192\u9669",
      detailed: "\u6731\u4E3D\u5B89\xB7\u6469\u5C14",
      image: person_1231_default
    },
    {
      id: 4935,
      name: "\u76AE\u7279\xB7\u6CE2\u65AF\u5C14\u601D\u97E6\u7279",
      category: "\u5192\u9669",
      detailed: "\u76AE\u7279\xB7\u6CE2\u65AF\u5C14\u601D\u97E6\u7279",
      image: person_4935_default
    }
  ]);
  var series = withAddedDates([
    { id: 1, name: "\u6C99\u4E18", category: "\u79D1\u5E7B", image: backdrop_default },
    { id: 2, name: "\u8718\u86DB\u4FA0\uFF1A\u8718\u86DB\u5B87\u5B99", category: "\u52A8\u753B", image: backdrop_default6 },
    { id: 3, name: "\u65E0\u95F4\u9053", category: "\u72AF\u7F6A", image: backdrop_default8 },
    { id: 4, name: "\u8759\u8760\u4FA0\uFF1A\u9ED1\u6697\u9A91\u58EB", category: "\u52A8\u4F5C", image: backdrop_default11 },
    { id: 5, name: "\u5934\u8111\u7279\u5DE5\u961F", category: "\u52A8\u753B", image: backdrop_default27 },
    { id: 6, name: "\u963F\u51E1\u8FBE", category: "\u79D1\u5E7B", image: backdrop_default29 },
    { id: 7, name: "\u4F8F\u7F57\u7EAA\u516C\u56ED", category: "\u5192\u9669", image: backdrop_default37 }
  ]);
  var categories = [
    "\u5168\u90E8",
    ...new Set(films.map((film) => film.category))
  ];
  return __toCommonJS(cinemaCatalog_exports);
})();
