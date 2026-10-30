import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { QRConfig, INSTAGRAM_GRADIENTS, QRStyle, LogoStyle } from '../types';

/**
 * Calculates coordinates for an SVG linear gradient matching CSS angles
 * (0deg is UP, 90deg is RIGHT, 180deg is DOWN, 270deg is LEFT)
 */
function getSvgGradientCoords(angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const x1 = Math.round(50 - cos * 50);
  const y1 = Math.round(50 - sin * 50);
  const x2 = Math.round(50 + cos * 50);
  const y2 = Math.round(50 + sin * 50);

  return { x1: `${x1}%`, y1: `${y1}%`, x2: `${x2}%`, y2: `${y2}%` };
}

/**
 * Generates pure vector SVG markup from QRConfig
 */
export function generateSVGString(config: QRConfig): string {
  const usernameClean = config.username.trim().replace(/^@/, '');
  const instagramUrl = usernameClean
    ? `https://instagram.com/${usernameClean}`
    : 'https://instagram.com';

  const qr = QRCode.create(instagramUrl, { errorCorrectionLevel: 'H' });
  const { modules } = qr;
  const matrixSize = modules.size;

  const isCard = config.qrType === 'card';
  const width = isCard ? 600 : 600;
  const height = isCard ? 780 : 600;

  // Active gradient colors
  const activeGradient = INSTAGRAM_GRADIENTS.find(g => g.id === config.styleId) || INSTAGRAM_GRADIENTS[0];
  let gradientColors = activeGradient.colors;
  if (config.styleId === 'custom') {
    gradientColors = [config.customColor1, config.customColor2];
  }
  const angle = config.gradientAngle ?? 45;
  const gradCoords = getSvgGradientCoords(angle);

  // Gradient stops
  const gradientStops = gradientColors
    .map((color, idx) => {
      const offset = Math.round((idx / (gradientColors.length - 1)) * 100);
      return `<stop offset="${offset}%" stop-color="${color}" />`;
    })
    .join('\n      ');

  let svgElements = '';

  if (isCard) {
    // Card Mode Background
    svgElements += `
    <!-- Card Gradient Background -->
    <rect width="${width}" height="${height}" rx="42" fill="url(#cardGradient)" />
    `;

    // White / Dark Card Box
    const qrBoxSize = width * 0.74; // ~444px
    const qrBoxX = (width - qrBoxSize) / 2;
    const qrBoxY = height * 0.14; // ~109px
    const isDarkCardBox = config.qrBgColor === '#111827' || config.qrBgColor === '#000000';
    const cardBoxBgColor = isDarkCardBox ? '#111827' : '#FFFFFF';

    svgElements += `
    <!-- QR Container Box -->
    <filter id="boxShadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-opacity="0.16" />
    </filter>
    <rect x="${qrBoxX}" y="${qrBoxY}" width="${qrBoxSize}" height="${qrBoxSize}" rx="32" fill="${cardBoxBgColor}" filter="url(#boxShadow)" />
    `;

    // Calculate modules inside the box
    const qrPadding = qrBoxSize * 0.08;
    const qrDrawSize = qrBoxSize - qrPadding * 2;
    const cellSize = qrDrawSize / matrixSize;
    const qrStartX = qrBoxX + qrPadding;
    const qrStartY = qrBoxY + qrPadding;

    let finalQRColor = config.qrColor || '#111827';
    if (isDarkCardBox && (finalQRColor === '#111827' || finalQRColor === '#000000')) {
      finalQRColor = '#FFFFFF';
    }
    const moduleFill = config.qrColor === 'gradient' ? 'url(#cardGradient)' : finalQRColor;
    const eyeFill = config.contrastEyes
      ? (isDarkCardBox ? '#FFFFFF' : '#111827')
      : moduleFill;

    svgElements += renderQRModules(
      modules,
      matrixSize,
      qrStartX,
      qrStartY,
      cellSize,
      moduleFill,
      cardBoxBgColor,
      config.qrStyle,
      config.contrastDots,
      config.logoStyle !== 'none'
    );

    // Finder Patterns (Eyes)
    svgElements += renderFinderPatterns(
      qrStartX,
      qrStartY,
      cellSize,
      matrixSize,
      eyeFill,
      cardBoxBgColor
    );

    // Central Instagram Logo
    if (config.logoStyle !== 'none') {
      const centerCell = Math.floor(matrixSize / 2);
      const logoSize = cellSize * 7;
      const logoX = qrStartX + (centerCell - 3) * cellSize;
      const logoY = qrStartY + (centerCell - 3) * cellSize;
      svgElements += renderInstagramLogoSVG(
        logoX,
        logoY,
        logoSize,
        config.logoStyle,
        isDarkCardBox
      );
    }

    // Username
    if (config.showUsername) {
      const displayUsername = usernameClean ? `@${usernameClean.toUpperCase()}` : '@INSTAGRAM';
      const textY = qrBoxY + qrBoxSize + 52;
      svgElements += `
      <!-- Instagram Handle -->
      <text x="${width / 2}" y="${textY}" text-anchor="middle" font-family="'Inter', -apple-system, sans-serif" font-weight="800" font-size="28" fill="#FFFFFF" letter-spacing="1">
        ${displayUsername}
      </text>
      `;
    }

    // Instruction Text
    if (config.showInstruction) {
      const instructionY = qrBoxY + qrBoxSize + (config.showUsername ? 84 : 48);
      const instructionText = config.instructionText || 'As pessoas podem ler esse QR code com a câmera do smartphone para ver o perfil.';
      svgElements += `
      <!-- Instruction Text -->
      <text x="${width / 2}" y="${instructionY}" text-anchor="middle" font-family="'Inter', -apple-system, sans-serif" font-weight="500" font-size="14" fill="rgba(255, 255, 255, 0.88)">
        ${escapeXml(instructionText)}
      </text>
      `;
    }
  } else {
    // QR-Only Mode
    const isDarkBg = config.qrBgColor === '#111827' || config.qrBgColor === '#000000';
    if (config.qrBgColor !== 'transparent') {
      svgElements += `
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="${config.qrBgColor}" />
      `;
    }

    const qrPadding = width * 0.08;
    const qrDrawSize = width - qrPadding * 2;
    const cellSize = qrDrawSize / matrixSize;
    const qrStartX = qrPadding;
    const qrStartY = qrPadding;

    let finalQRColor = config.qrColor || '#111827';
    if (isDarkBg && (finalQRColor === '#111827' || finalQRColor === '#000000')) {
      finalQRColor = '#FFFFFF';
    }
    const moduleFill = config.qrColor === 'gradient' ? 'url(#cardGradient)' : finalQRColor;
    const eyeFill = config.contrastEyes
      ? (isDarkBg ? '#FFFFFF' : '#111827')
      : moduleFill;
    const bgForEyes = config.qrBgColor === 'transparent' ? '#FFFFFF' : config.qrBgColor;

    svgElements += renderQRModules(
      modules,
      matrixSize,
      qrStartX,
      qrStartY,
      cellSize,
      moduleFill,
      isDarkBg ? '#111827' : '#FFFFFF',
      config.qrStyle,
      config.contrastDots,
      config.logoStyle !== 'none'
    );

    // Finder patterns
    svgElements += renderFinderPatterns(
      qrStartX,
      qrStartY,
      cellSize,
      matrixSize,
      eyeFill,
      bgForEyes
    );

    // Logo
    if (config.logoStyle !== 'none') {
      const centerCell = Math.floor(matrixSize / 2);
      const logoSize = cellSize * 7;
      const logoX = qrStartX + (centerCell - 3) * cellSize;
      const logoY = qrStartY + (centerCell - 3) * cellSize;
      svgElements += renderInstagramLogoSVG(
        logoX,
        logoY,
        logoSize,
        config.logoStyle,
        isDarkBg
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="cardGradient" x1="${gradCoords.x1}" y1="${gradCoords.y1}" x2="${gradCoords.x2}" y2="${gradCoords.y2}">
      ${gradientStops}
    </linearGradient>
  </defs>
  ${svgElements}
</svg>`;
}

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function renderQRModules(
  modules: any,
  matrixSize: number,
  qrStartX: number,
  qrStartY: number,
  cellSize: number,
  fillColor: string,
  bgColor: string,
  qrStyle: QRStyle,
  contrastDots: boolean,
  hasLogo: boolean
): string {
  let paths = '';
  const centerCell = Math.floor(matrixSize / 2);
  const logoCellRadius = 3;

  for (let row = 0; row < matrixSize; row++) {
    for (let col = 0; col < matrixSize; col++) {
      // 1. Skip Finder Patterns
      const isTopLeftFinder = row < 7 && col < 7;
      const isTopRightFinder = row < 7 && col >= matrixSize - 7;
      const isBottomLeftFinder = row >= matrixSize - 7 && col < 7;
      if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) continue;

      // 2. Skip Logo Area
      if (hasLogo &&
        row >= centerCell - logoCellRadius && row <= centerCell + logoCellRadius &&
        col >= centerCell - logoCellRadius && col <= centerCell + logoCellRadius
      ) {
        continue;
      }

      if (modules.get(row, col)) {
        const x = qrStartX + col * cellSize;
        const y = qrStartY + row * cellSize;

        if (qrStyle === 'dots') {
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;
          const r = (cellSize / 2) * 0.85;
          paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillColor}" />\n`;

          if (contrastDots) {
            const innerBg = bgColor === '#111827' || bgColor === '#000000' ? '#111827' : '#FFFFFF';
            const centerFill = innerBg === '#FFFFFF' ? '#111827' : '#FFFFFF';
            paths += `<circle cx="${cx}" cy="${cy}" r="${r * 0.45}" fill="${innerBg}" />\n`;
            paths += `<circle cx="${cx}" cy="${cy}" r="${r * 0.2}" fill="${centerFill}" />\n`;
          }
        } else if (qrStyle === 'rounded') {
          const r = cellSize * 0.35;
          paths += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${cellSize - 1}" height="${cellSize - 1}" rx="${r}" fill="${fillColor}" />\n`;

          if (contrastDots) {
            const innerBg = bgColor === '#111827' || bgColor === '#000000' ? '#111827' : '#FFFFFF';
            const centerFill = innerBg === '#FFFFFF' ? '#111827' : '#FFFFFF';
            paths += `<rect x="${x + cellSize * 0.3}" y="${y + cellSize * 0.3}" width="${cellSize * 0.4}" height="${cellSize * 0.4}" rx="${cellSize * 0.1}" fill="${innerBg}" />\n`;
            paths += `<rect x="${x + cellSize * 0.4}" y="${y + cellSize * 0.4}" width="${cellSize * 0.2}" height="${cellSize * 0.2}" rx="${cellSize * 0.05}" fill="${centerFill}" />\n`;
          }
        } else {
          paths += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fillColor}" />\n`;

          if (contrastDots) {
            const innerBg = bgColor === '#111827' || bgColor === '#000000' ? '#111827' : '#FFFFFF';
            const centerFill = innerBg === '#FFFFFF' ? '#111827' : '#FFFFFF';
            paths += `<rect x="${x + cellSize * 0.3}" y="${y + cellSize * 0.3}" width="${cellSize * 0.4}" height="${cellSize * 0.4}" fill="${innerBg}" />\n`;
            paths += `<rect x="${x + cellSize * 0.4}" y="${y + cellSize * 0.4}" width="${cellSize * 0.2}" height="${cellSize * 0.2}" fill="${centerFill}" />\n`;
          }
        }
      }
    }
  }

  return paths;
}

function renderFinderPatterns(
  qrStartX: number,
  qrStartY: number,
  cellSize: number,
  matrixSize: number,
  fillColor: string,
  bgColor: string
): string {
  const drawOneEye = (x: number, y: number) => {
    const size = cellSize * 7;
    const radius = cellSize * 1.8;
    const innerOffset = cellSize;
    const innerSize = cellSize * 5;
    const innerRadius = cellSize * 1.2;
    const centerOffset = cellSize * 2;
    const centerSize = cellSize * 3;
    const centerRadius = cellSize * 0.6;

    return `
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fillColor}" />
    <rect x="${x + innerOffset}" y="${y + innerOffset}" width="${innerSize}" height="${innerSize}" rx="${innerRadius}" fill="${bgColor}" />
    <rect x="${x + centerOffset}" y="${y + centerOffset}" width="${centerSize}" height="${centerSize}" rx="${centerRadius}" fill="${fillColor}" />
    `;
  };

  return (
    drawOneEye(qrStartX, qrStartY) +
    drawOneEye(qrStartX + (matrixSize - 7) * cellSize, qrStartY) +
    drawOneEye(qrStartX, qrStartY + (matrixSize - 7) * cellSize)
  );
}

function renderInstagramLogoSVG(
  x: number,
  y: number,
  size: number,
  logoStyle: LogoStyle,
  isDarkBg: boolean
): string {
  const maskBg = isDarkBg ? '#111827' : '#FFFFFF';
  let strokeColor = isDarkBg ? '#FFFFFF' : '#000000';
  let innerBadge = '';

  if (logoStyle === 'classic') {
    strokeColor = 'url(#cardGradient)';
  } else if (logoStyle === 'white') {
    strokeColor = '#FFFFFF';
    if (!isDarkBg) {
      innerBadge = `<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.58}" fill="#111827" />`;
    }
  } else if (logoStyle === 'dark') {
    strokeColor = isDarkBg ? '#FFFFFF' : '#111827';
    if (isDarkBg) {
      innerBadge = `<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.58}" fill="#1F2937" />`;
    }
  }

  const padding = size * 0.16;
  const sWidth = size - padding * 2;
  const r = size * 0.2;
  const strokeWidth = size * 0.08;

  return `
  <g transform="translate(${x}, ${y})">
    <!-- Mask behind logo -->
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.65}" fill="${maskBg}" />
    ${innerBadge}
    <!-- Camera Body -->
    <rect x="${padding}" y="${padding}" width="${sWidth}" height="${sWidth}" rx="${r}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Camera Lens -->
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.18}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
    <!-- Camera Flash Dot -->
    <circle cx="${size * 0.70}" cy="${size * 0.30}" r="${size * 0.045}" fill="${strokeColor}" />
  </g>
  `;
}

/**
 * Triggers SVG download
 */
export function downloadSVG(config: QRConfig, fileName: string): void {
  const svgContent = generateSVGString(config);
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.svg') ? fileName : `${fileName}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers high-resolution PDF download using jsPDF
 */
export function downloadPDF(config: QRConfig, canvas: HTMLCanvasElement, fileName: string): void {
  const imgData = canvas.toDataURL('image/png', 1.0);
  const isCard = config.qrType === 'card';
  const usernameClean = config.username.trim().replace(/^@/, '') || 'instagram';

  // Standard A4 dimensions in mm: 210 x 297
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Background tint header
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, 0, 210, 42, 'F');

  // Title and Brand
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(17, 24, 39);
  pdf.text('QRJeanerator - Crachá Oficial Instagram', 105, 18, { align: 'center' });

  // Subtitle / Handle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(99, 102, 241);
  pdf.text(`@${usernameClean.toUpperCase()}`, 105, 27, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Pronto para Impressão em Alta Fidelidade (Displays, Balcões e Vitrines)', 105, 34, { align: 'center' });

  // Add QR Art Centered on Page
  const canvasRatio = canvas.width / canvas.height;
  const printWidth = isCard ? 135 : 145;
  const printHeight = printWidth / canvasRatio;
  const posX = (210 - printWidth) / 2;
  const posY = 48;

  // Subtle cut guide border
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(posX - 2, posY - 2, printWidth + 4, printHeight + 4, 3, 3, 'S');

  // Embed PNG image
  pdf.addImage(imgData, 'PNG', posX, posY, printWidth, printHeight, undefined, 'FAST');

  // Practical print advice at bottom
  const infoY = posY + printHeight + 14;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 41, 59);
  pdf.text('Recomendações para Gráfica e Balcão:', 105, infoY, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('• Impressão recomendada em Papel Couchê 250g/m² ou Vinil Adesivo Fosco.', 105, infoY + 6, { align: 'center' });
  pdf.text('• Compatível com suportes de acrílico padrão A5/A6 para mesas e recepções.', 105, infoY + 11, { align: 'center' });

  // Footer copyright
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Gerado por QRJeanerator • ${new Date().toLocaleDateString('pt-BR')}`, 105, 287, { align: 'center' });

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
