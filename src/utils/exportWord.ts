import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  UnderlineType,
  convertMillimetersToTwip
} from 'docx';
import { LOGO_BASE64 } from '../assets/logoBase64';

export interface ExportWordSuratParams {
  jenisSurat: 'pindah' | 'ket-siswa';
  nomorSurat: string;
  tanggalSurat: string;
  // Pejabat
  namaKepsek: string;
  pangkatKepsek: string;
  nipKepsek: string;
  jabatanKepsek: string;
  unitKerjaKepsek: string;
  // Siswa
  studentNama: string;
  studentJK: string;
  studentTTL: string;
  studentNISN: string;
  studentNIPD: string;
  studentAgama: string;
  studentAyah: string;
  studentIbu: string;
  programKeahlian: string;
  konsentrasiKeahlian: string;
  // Pindah specific
  sekarangKelas?: string;
  sekolahTujuan?: string;
  customAlamat?: string;
  pekerjaanOrtu?: string;
  // Keterangan Siswa specific
  nisSiswa?: string;
  kelasJurusanKet?: string;
  tahunPelajaran?: string;
  keperluanSurat?: string;
}

function formatIndonesianDate(dateInput?: string | Date): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatNIP(rawNip?: string): string {
  if (!rawNip) return '';
  const digits = rawNip.replace(/\s+/g, '');
  if (digits.length === 18) {
    return `${digits.slice(0, 8)} ${digits.slice(8, 14)} ${digits.slice(14, 15)} ${digits.slice(15, 18)}`;
  }
  return rawNip;
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const noBorders = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
  insideHorizontal: noBorder,
  insideVertical: noBorder
};

export async function downloadSuratWord(params: ExportWordSuratParams): Promise<void> {
  const {
    jenisSurat,
    nomorSurat,
    tanggalSurat,
    namaKepsek,
    pangkatKepsek,
    nipKepsek,
    jabatanKepsek,
    unitKerjaKepsek,
    studentNama,
    studentJK,
    studentTTL,
    studentNISN,
    studentNIPD,
    studentAgama,
    studentAyah,
    studentIbu,
    programKeahlian,
    konsentrasiKeahlian,
    sekarangKelas = 'XI',
    sekolahTujuan = 'SMA NEGERI 4 PALOPO',
    customAlamat = 'Jl. KHM. Kasim No. 10 Palopo',
    pekerjaanOrtu = '-',
    nisSiswa = '2025076',
    kelasJurusanKet = 'XI / Akuntansi',
    tahunPelajaran = '2026/2027',
    keperluanSurat = ''
  } = params;

  // Konfigurasi Font: Calibri, Size: 12pt (24 half-points), Spasi: 1.5 (360 twips)
  const fontName = 'Calibri';
  const defaultFontSize = 24; // 12pt
  const lineSpacing15 = 360;  // Spasi 1.5 line pitch

  // 1. KOP SURAT TABLE: 3 Kolom agar teks kop tetap tepat di tengah kertas
  const kopTextRuns = jenisSurat === 'ket-siswa' ? [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, after: 30 },
      children: [
        new TextRun({ text: 'PEMERINTAH PROVINSI SULAWESI SELATAN', bold: true, size: 24, font: fontName })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, after: 30 },
      children: [
        new TextRun({ text: 'DINAS PENDIDIKAN', bold: true, size: 24, font: fontName })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, after: 40 },
      children: [
        new TextRun({ text: 'UPT-SMK NEG. 1 PALOPO', bold: true, size: 26, font: fontName })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 220, after: 20 },
      children: [
        new TextRun({
          text: 'Jln.K.H.M. Kasim No.10 Telp.(0471) 3200930, Kelurahan Pattene, Kota Palopo',
          size: 18,
          font: fontName
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 220 },
      children: [
        new TextRun({
          text: 'Website : http://smknegeri1palopo.sch.id Email : info@smknegeri1palopo.sch.id',
          size: 18,
          font: fontName
        })
      ]
    })
  ] : [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, after: 30 },
      children: [
        new TextRun({ text: 'PEMERINTAH PROVINSI SULAWESI SELATAN', bold: true, size: 24, font: fontName })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, after: 30 },
      children: [
        new TextRun({ text: 'DINAS PENDIDIKAN', bold: true, size: 24, font: fontName })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240, after: 40 },
      children: [
        new TextRun({ text: 'SEKOLAH MENENGAH KEJURUAN NEGERI 1 PALOPO', bold: true, size: 26, font: fontName })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 220, after: 20 },
      children: [
        new TextRun({
          text: 'Jl. KHM. Kasim NO. 10 Kota Palopo Sulawesi Selatan',
          size: 18,
          font: fontName
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 220 },
      children: [
        new TextRun({
          text: 'Website : http://www.smkn1-palopo.sch.id E.mail: info@smknegeri1palopo.sch.id',
          size: 18,
          font: fontName
        })
      ]
    })
  ];

  const kopTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          // Cell Kiri (Logo)
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: LOGO_BASE64,
                    type: 'png',
                    transformation: { width: 68, height: 68 }
                  })
                ]
              })
            ]
          }),
          // Cell Tengah (Teks Kop Surat - Ditengah Kertas)
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: kopTextRuns
          }),
          // Cell Kanan (Spacer penyeimbang agar teks tepat di tengah kertas)
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [new Paragraph({ text: '' })]
          })
        ]
      })
    ]
  });

  // Garis Pembatas Ganda di Bawah Kop Surat
  const separatorParagraph = new Paragraph({
    border: {
      bottom: {
        style: BorderStyle.DOUBLE,
        size: 12,
        color: '000000',
        space: 2
      }
    },
    spacing: { after: 180 }
  });

  // Children sections
  const docChildren: (Paragraph | Table)[] = [
    kopTable,
    separatorParagraph
  ];

  if (jenisSurat === 'pindah') {
    // ================= SURAT KETERANGAN PINDAH =================
    // Judul & Nomor
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 40, line: lineSpacing15 },
        children: [
          new TextRun({
            text: 'SURAT KETERANGAN PINDAH',
            bold: true,
            size: 26,
            underline: { type: UnderlineType.SINGLE },
            font: fontName
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 140, line: lineSpacing15 },
        children: [
          new TextRun({
            text: `Nomor : ${nomorSurat}`,
            size: defaultFontSize,
            font: fontName
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 100, line: lineSpacing15 },
        children: [
          new TextRun({
            text: 'Kepala SMK Negeri 1 Palopo dengan ini menerangkan bahwa :',
            size: defaultFontSize,
            font: fontName
          })
        ]
      })
    );

    // 12 Poin Siswa (Tabel 3 Kolom: No+Label, :, Value) dengan Spasi 1.5 dan Font 12
    const pindahItems = [
      { no: '1.', label: 'Nama', value: studentNama, isBold: true },
      { no: '2.', label: 'Jenis Kelamin', value: studentJK, isBold: false },
      { no: '3.', label: 'Tingkat / Kelas', value: sekarangKelas, isBold: false },
      { no: '4.', label: 'Program Keahlian', value: programKeahlian, isBold: false },
      { no: '5.', label: 'Konsentrasi Keahlian', value: konsentrasiKeahlian, isBold: false },
      { no: '6.', label: 'Nomor Induk Siswa Nasional (NISN)', value: studentNISN, isBold: false },
      { no: '7.', label: 'Nomor Induk Peserta Didik (NIPD)', value: studentNIPD, isBold: false },
      { no: '8.', label: 'Tempat / Tanggal Lahir', value: studentTTL, isBold: false },
      { no: '9.', label: 'Agama', value: studentAgama, isBold: false },
      { no: '10.', label: 'Nama Orang Tua / Wali', value: `Ayah: ${studentAyah}  |  Ibu: ${studentIbu}`, isBold: false },
      { no: '11.', label: 'Pekerjaan Orang Tua', value: pekerjaanOrtu, isBold: false },
      { no: '12.', label: 'Alamat Lengkap Siswa / Orang Tua', value: customAlamat, isBold: false }
    ];

    const studentTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: pindahItems.map((item) => new TableRow({
        children: [
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: item.no, size: defaultFontSize, font: fontName })]
              })
            ]
          }),
          new TableCell({
            width: { size: 38, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: item.label, size: defaultFontSize, font: fontName })]
              })
            ]
          }),
          new TableCell({
            width: { size: 3, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: ':', size: defaultFontSize, font: fontName })]
              })
            ]
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: item.value, size: defaultFontSize, bold: item.isBold, font: fontName })]
              })
            ]
          })
        ]
      }))
    });
    docChildren.push(studentTable);

    // Keterangan Pindah
    docChildren.push(
      new Paragraph({
        spacing: { before: 120, after: 60, line: lineSpacing15 },
        children: [
          new TextRun({
            text: 'Sesuai dengan Surat Permohonan Pindah Sekolah oleh orang tua / wali siswa :',
            size: defaultFontSize,
            font: fontName
          })
        ]
      })
    );

    const permohonanTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({ text: '' })]
            }),
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: 'Telah mengajukan pindah ke', size: defaultFontSize, font: fontName })]
                })
              ]
            }),
            new TableCell({
              width: { size: 3, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: ':', size: defaultFontSize, font: fontName })]
                })
              ]
            }),
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: sekolahTujuan, size: defaultFontSize, bold: true, font: fontName })]
                })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({ text: '' })]
            }),
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: 'Dengan alasan', size: defaultFontSize, font: fontName })]
                })
              ]
            }),
            new TableCell({
              width: { size: 3, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: ':', size: defaultFontSize, font: fontName })]
                })
              ]
            }),
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: 'Mengikuti Orang Tua', size: defaultFontSize, font: fontName })]
                })
              ]
            })
          ]
        })
      ]
    });
    docChildren.push(permohonanTable);

    // Paragraf Peringatan
    docChildren.push(
      new Paragraph({
        spacing: { before: 120, after: 80, line: lineSpacing15 },
        children: [
          new TextRun({
            text: 'Dengan dikeluarkannya surat keterangan ini, siswa tersebut diatas tidak diperkenankan masuk kembali. Dengan mempergunakan surat pindah tersebut.',
            italics: true,
            size: defaultFontSize,
            font: fontName
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 160, line: lineSpacing15 },
        children: [
          new TextRun({
            text: 'Demikian Surat Keterangan ini kami berikan kepada yang bersangkutan untuk dipergunakan seperlunya.',
            size: defaultFontSize,
            font: fontName
          })
        ]
      })
    );

    // Bagian TTD (Kanan Bawah)
    const ttdTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({ text: '' })]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: `Palopo, ${formatIndonesianDate(tanggalSurat)}`, size: defaultFontSize, font: fontName })]
                }),
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: `${jabatanKepsek},`, size: defaultFontSize, font: fontName })]
                }),
                new Paragraph({ text: '', spacing: { after: 500 } }), // Ruang Tanda Tangan
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [
                    new TextRun({
                      text: namaKepsek,
                      bold: true,
                      size: defaultFontSize,
                      underline: { type: UnderlineType.SINGLE },
                      font: fontName
                    })
                  ]
                }),
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: `Pangkat : ${pangkatKepsek}`, size: defaultFontSize, font: fontName })]
                }),
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: `NIP: ${nipKepsek}`, size: defaultFontSize, font: fontName })]
                })
              ]
            })
          ]
        })
      ]
    });
    docChildren.push(ttdTable);

  } else {
    // ================= SURAT KETERANGAN SISWA =================
    // Judul & Nomor
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 40, line: lineSpacing15 },
        children: [
          new TextRun({
            text: 'SURAT KETERANGAN',
            bold: true,
            size: 26,
            underline: { type: UnderlineType.SINGLE },
            font: fontName
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 140, line: lineSpacing15 },
        children: [
          new TextRun({
            text: `Nomor : ${nomorSurat}`,
            size: defaultFontSize,
            font: fontName
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 100, line: lineSpacing15 },
        children: [
          new TextRun({
            text: 'Yang bertanda tangan di bawah ini :',
            size: defaultFontSize,
            font: fontName
          })
        ]
      })
    );

    // Data Pejabat (Kepala Sekolah)
    const pejabatItems = [
      { label: 'Nama', value: namaKepsek, isBold: true },
      { label: 'Pangkat / Gol.', value: pangkatKepsek, isBold: false },
      { label: 'NIP', value: nipKepsek, isBold: false },
      { label: 'Jabatan', value: jabatanKepsek, isBold: false },
      { label: 'Unit Kerja', value: unitKerjaKepsek, isBold: false }
    ];

    const pejabatTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: pejabatItems.map((item) => new TableRow({
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [new Paragraph({ text: '' })]
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: item.label, size: defaultFontSize, font: fontName })]
              })
            ]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: ':', size: defaultFontSize, font: fontName })]
              })
            ]
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: item.value, size: defaultFontSize, bold: item.isBold, font: fontName })]
              })
            ]
          })
        ]
      }))
    });
    docChildren.push(pejabatTable);

    // Menerangkan bahwa
    docChildren.push(
      new Paragraph({
        spacing: { before: 120, after: 100, line: lineSpacing15 },
        children: [
          new TextRun({
            text: 'Menerangkan bahwa :',
            size: defaultFontSize,
            font: fontName
          })
        ]
      })
    );

    // Data Siswa
    const siswaItems = [
      { label: 'Nama', value: studentNama, isBold: true },
      { label: 'NIS/NISN', value: `${nisSiswa} / ${studentNISN}`, isBold: false },
      { label: 'Kelas', value: kelasJurusanKet, isBold: false }
    ];

    const siswaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: siswaItems.map((item) => new TableRow({
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [new Paragraph({ text: '' })]
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: item.label, size: defaultFontSize, font: fontName })]
              })
            ]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: ':', size: defaultFontSize, font: fontName })]
              })
            ]
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { line: lineSpacing15 },
                children: [new TextRun({ text: item.value, size: defaultFontSize, bold: item.isBold, font: fontName })]
              })
            ]
          })
        ]
      }))
    });
    docChildren.push(siswaTable);

    // Paragraf Pernyataan
    let pernyataanTeks = `Benar adalah siswa pada SMK Negeri 1 Palopo Tahun Pelajaran ${tahunPelajaran}.`;
    if (keperluanSurat && keperluanSurat.trim()) {
      pernyataanTeks += ` Surat Keterangan ini dibuat untuk keperluan ${keperluanSurat.trim()}.`;
    }

    docChildren.push(
      new Paragraph({
        spacing: { before: 140, after: 80, line: lineSpacing15 },
        children: [
          new TextRun({
            text: pernyataanTeks,
            size: defaultFontSize,
            font: fontName
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 180, line: lineSpacing15 },
        children: [
          new TextRun({
            text: 'Demikian Surat Keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.',
            size: defaultFontSize,
            font: fontName
          })
        ]
      })
    );

    // Bagian TTD (Kanan Bawah)
    const ttdTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({ text: '' })]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: `Palopo, ${formatIndonesianDate(tanggalSurat)}`, size: defaultFontSize, font: fontName })]
                }),
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: `${jabatanKepsek},`, size: defaultFontSize, font: fontName })]
                }),
                new Paragraph({ text: '', spacing: { after: 500 } }), // Ruang Tanda Tangan
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [
                    new TextRun({
                      text: namaKepsek,
                      bold: true,
                      size: defaultFontSize,
                      underline: { type: UnderlineType.SINGLE },
                      font: fontName
                    })
                  ]
                }),
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: `Pangkat : ${pangkatKepsek.split(',')[0].trim()}`, size: defaultFontSize, font: fontName })]
                }),
                new Paragraph({
                  spacing: { line: lineSpacing15 },
                  children: [new TextRun({ text: `NIP. ${formatNIP(nipKepsek)}`, size: defaultFontSize, font: fontName })]
                })
              ]
            })
          ]
        })
      ]
    });
    docChildren.push(ttdTable);
  }

  // Buat Document docx dengan Default Styles (Calibri, 12pt, Spasi 1.5)
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: fontName,
            size: defaultFontSize, // 12pt
          },
          paragraph: {
            spacing: {
              line: lineSpacing15, // Spasi 1.5
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(18),
              bottom: convertMillimetersToTwip(18),
              left: convertMillimetersToTwip(20),
              right: convertMillimetersToTwip(20)
            }
          }
        },
        children: docChildren
      }
    ]
  });

  // Export ke Blob dan trigger download
  const blob = await Packer.toBlob(doc);
  const cleanName = studentNama.replace(/\s+/g, '_');
  const filename = jenisSurat === 'pindah'
    ? `Surat_Keterangan_Pindah_${cleanName}_${studentNISN}.docx`
    : `Surat_Keterangan_${cleanName}_${studentNISN}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
