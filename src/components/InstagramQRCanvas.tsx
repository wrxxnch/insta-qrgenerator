import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QRConfig, INSTAGRAM_GRADIENTS, LogoStyle } from '../types';
import { Camera, RefreshCw } from 'lucide-react';

interface InstagramQRCanvasProps {
  config: QRConfig;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function InstagramQRCanvas({ config, onCanvasReady }: InstagramQRCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Helper to draw a rounded rectangle on a 2D canvas context
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  // Helper to compute a linear gradient at any angle matching CSS linear-gradient(deg)
  const createAngledGradient = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    angleDeg: number,
    colors: string[]
  ): CanvasGradient => {
    const cx = x + width / 2;
    const cy = y + height / 2;

    // CSS linear-gradient: 0deg is UP, 90deg is RIGHT, 180deg is DOWN, 270deg is LEFT.
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Compute bounding length to ensure corners receive full gradient stops
    const length = Math.abs(width * cos) + Math.abs(height * sin);
    const halfLen = length / 2;

    const x0 = cx - cos * halfLen;
    const y0 = cy - sin * halfLen;
    const x1 = cx + cos * halfLen;
    const y1 = cy + sin * halfLen;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    if (!colors || colors.length === 0) {
      grad.addColorStop(0, '#f09433');
      grad.addColorStop(1, '#bc1888');
    } else if (colors.length === 1) {
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[0]);
    } else {
      colors.forEach((color, idx) => {
        grad.addColorStop(idx / (colors.length - 1), color);
      });
    }
    return grad;
  };

  // Helper to draw the Instagram Logo in the center of the QR Code
  const drawInstagramLogo = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    logoStyle: LogoStyle,
    gradientColors: string[],
    isDarkBg: boolean = false,
    gradientAngle: number = 45
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // 1. Draw rounded background behind the logo to mask QR modules cleanly
    ctx.fillStyle = isDarkBg ? '#111827' : '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.65, 0, 2 * Math.PI);
    ctx.fill();

    // 2. Select logo color based on style
    let color: string | CanvasGradient = isDarkBg ? '#FFFFFF' : '#000000';
    if (logoStyle === 'classic') {
      const grad = createAngledGradient(ctx, 0, 0, size, size, gradientAngle, gradientColors);
      color = grad;
    } else if (logoStyle === 'white') {
      color = '#FFFFFF';
      if (!isDarkBg) {
        // Draw a dark circle background badge first if on light background
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.58, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (logoStyle === 'dark') {
      color = isDarkBg ? '#FFFFFF' : '#111827';
      if (isDarkBg) {
        ctx.fillStyle = '#1F2937';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.58, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer rounded square of the camera
    const padding = size * 0.16;
    const r = size * 0.2;
    const sWidth = size - padding * 2;
    drawRoundedRect(ctx, padding, padding, sWidth, sWidth, r);
    ctx.stroke();

    // Inner lens circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.18, 0, 2 * Math.PI);
    ctx.stroke();

    // Flash dot
    ctx.beginPath();
    ctx.arc(size * 0.70, size * 0.30, size * 0.045, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
  };

  // Helper to draw a custom rounded finder pattern ("eye")
  const drawFinderPattern = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cellSize: number,
    color: string | CanvasGradient,
    bgColor: string
  ) => {
    const size = cellSize * 7;
    const radius = cellSize * 1.8;

    // Outer square
    ctx.fillStyle = color;
    drawRoundedRect(ctx, x, y, size, size, radius);
    ctx.fill();

    // Inner background block (usually white or transparent)
    ctx.fillStyle = bgColor === 'transparent' ? '#FFFFFF' : bgColor;
    const innerOffset = cellSize;
    const innerSize = cellSize * 5;
    const innerRadius = cellSize * 1.2;
    drawRoundedRect(ctx, x + innerOffset, y + innerOffset, innerSize, innerSize, innerRadius);
    ctx.fill();

    // Center filled block
    ctx.fillStyle = color;
    const centerOffset = cellSize * 2;
    const centerSize = cellSize * 3;
    const centerRadius = cellSize * 0.6;
    drawRoundedRect(ctx, x + centerOffset, y + centerOffset, centerSize, centerSize, centerRadius);
    ctx.fill();
  };

  useEffect(() => {
    const generateQR = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setIsGenerating(true);
      setError(null);

      try {
        const usernameClean = config.username.trim().replace(/^@/, '');
        const instagramUrl = usernameClean 
          ? `https://instagram.com/${usernameClean}` 
          : 'https://instagram.com';

        // 1. Create the QR Code matrix using the 'qrcode' library
        // We use High Error Correction (H) to support placing the logo in the middle
        const qr = QRCode.create(instagramUrl, { errorCorrectionLevel: 'H' });
        const { modules } = qr;
        const matrixSize = modules.size;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context from canvas');

        // Clean canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get active gradient config
        const activeGradient = INSTAGRAM_GRADIENTS.find(g => g.id === config.styleId) || INSTAGRAM_GRADIENTS[0];
        let gradientColors = activeGradient.colors;
        if (config.styleId === 'custom') {
          gradientColors = [config.customColor1, config.customColor2];
        }

        // Setup dimensions based on the display size
        const width = canvas.width;
        const height = canvas.height;

        if (config.qrType === 'card') {
          // --- CARD MODE ---
          // Draw the full Instagram rounded card with gradient background

          // A. Draw Gradient Card Background
          const angle = config.gradientAngle ?? 45;
          const cardGrad = createAngledGradient(ctx, 0, 0, width, height, angle, gradientColors);
          ctx.fillStyle = cardGrad;
          drawRoundedRect(ctx, 0, 0, width, height, 32);
          ctx.fill();

          // B. Draw QR Code Container Box in the center
          // Box size is 74% of card width
          const qrBoxSize = width * 0.74;
          const qrBoxX = (width - qrBoxSize) / 2;
          const qrBoxY = height * 0.14; // Positioned near top
          
          const isDarkCardBox = config.qrBgColor === '#111827' || config.qrBgColor === '#000000';
          const cardBoxBgColor = isDarkCardBox ? '#111827' : '#FFFFFF';
          ctx.fillStyle = cardBoxBgColor;
          
          // Add drop shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 8;
          drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
          ctx.fill();
          
          // Reset shadow for subsequent drawings
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // C. Draw QR Code inside the box
          const qrPadding = qrBoxSize * 0.08;
          const qrDrawSize = qrBoxSize - qrPadding * 2;
          const cellSize = qrDrawSize / matrixSize;
          const qrStartX = qrBoxX + qrPadding;
          const qrStartY = qrBoxY + qrPadding;

          // Set QR module color with automatic inversion to white on dark background, or linear gradient
          let finalQRColor: string | CanvasGradient = config.qrColor || '#111827';
          if (isDarkCardBox && (finalQRColor === '#111827' || finalQRColor === '#000000')) {
            finalQRColor = '#FFFFFF';
          }
          if (config.qrColor === 'gradient') {
            finalQRColor = createAngledGradient(ctx, qrStartX, qrStartY, qrDrawSize, qrDrawSize, angle, gradientColors);
          }
          const finalQRBgColor = cardBoxBgColor;

          // Draw modules
          ctx.fillStyle = finalQRColor;

          const centerCell = Math.floor(matrixSize / 2);
          const logoCellRadius = 3; // 7x7 cell area

          for (let row = 0; row < matrixSize; row++) {
            for (let col = 0; col < matrixSize; col++) {
              // 1. Skip Finder Patterns (drawn separately for perfection)
              const isTopLeftFinder = row < 7 && col < 7;
              const isTopRightFinder = row < 7 && col >= matrixSize - 7;
              const isBottomLeftFinder = row >= matrixSize - 7 && col < 7;

              if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
                continue;
              }

              // 2. Skip Logo Area in the center
              const isLogoArea = config.logoStyle !== 'none' &&
                row >= centerCell - logoCellRadius && row <= centerCell + logoCellRadius &&
                col >= centerCell - logoCellRadius && col <= centerCell + logoCellRadius;

              if (isLogoArea) continue;

              // 3. Draw standard modules if filled
              if (modules.get(row, col)) {
                const x = qrStartX + col * cellSize;
                const y = qrStartY + row * cellSize;

                if (config.qrStyle === 'dots') {
                  ctx.beginPath();
                  ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 * 0.85, 0, 2 * Math.PI);
                  ctx.fill();

                  if (config.contrastDots) {
                    const dotInnerBg = isDarkCardBox ? '#111827' : '#FFFFFF';
                    const dotCenterFill = isDarkCardBox ? '#FFFFFF' : '#111827';

                    ctx.fillStyle = dotInnerBg;
                    ctx.beginPath();
                    ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 * 0.4, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.fillStyle = dotCenterFill;
                    ctx.beginPath();
                    ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 * 0.18, 0, 2 * Math.PI);
                    ctx.fill();

                    // Restore module color
                    ctx.fillStyle = finalQRColor;
                  }
                } else if (config.qrStyle === 'rounded') {
                  drawRoundedRect(ctx, x + 0.5, y + 0.5, cellSize - 1, cellSize - 1, cellSize * 0.35);
                  ctx.fill();

                  if (config.contrastDots) {
                    const dotInnerBg = isDarkCardBox ? '#111827' : '#FFFFFF';
                    const dotCenterFill = isDarkCardBox ? '#FFFFFF' : '#111827';

                    ctx.fillStyle = dotInnerBg;
                    drawRoundedRect(ctx, x + cellSize * 0.3, y + cellSize * 0.3, cellSize * 0.4, cellSize * 0.4, cellSize * 0.1);
                    ctx.fill();

                    ctx.fillStyle = dotCenterFill;
                    drawRoundedRect(ctx, x + cellSize * 0.4, y + cellSize * 0.4, cellSize * 0.2, cellSize * 0.2, cellSize * 0.05);
                    ctx.fill();

                    ctx.fillStyle = finalQRColor;
                  }
                } else {
                  ctx.fillRect(x, y, cellSize, cellSize);

                  if (config.contrastDots) {
                    const dotInnerBg = isDarkCardBox ? '#111827' : '#FFFFFF';
                    const dotCenterFill = isDarkCardBox ? '#FFFFFF' : '#111827';

                    ctx.fillStyle = dotInnerBg;
                    ctx.fillRect(x + cellSize * 0.3, y + cellSize * 0.3, cellSize * 0.4, cellSize * 0.4);
                    
                    ctx.fillStyle = dotCenterFill;
                    ctx.fillRect(x + cellSize * 0.4, y + cellSize * 0.4, cellSize * 0.2, cellSize * 0.2);

                    ctx.fillStyle = finalQRColor;
                  }
                }
              }
            }
          }

          // D. Draw Finder Patterns (Eyes) with custom style
          let eyeColor: string | CanvasGradient = finalQRColor;
          if (isDarkCardBox && (eyeColor === '#111827' || eyeColor === '#000000')) {
            eyeColor = '#FFFFFF';
          }
          if (config.contrastEyes) {
            eyeColor = isDarkCardBox ? '#FFFFFF' : '#111827';
          }
          drawFinderPattern(ctx, qrStartX, qrStartY, cellSize, eyeColor, finalQRBgColor); // Top-left
          drawFinderPattern(ctx, qrStartX + (matrixSize - 7) * cellSize, qrStartY, cellSize, eyeColor, finalQRBgColor); // Top-right
          drawFinderPattern(ctx, qrStartX, qrStartY + (matrixSize - 7) * cellSize, cellSize, eyeColor, finalQRBgColor); // Bottom-left

          // E. Draw Central Instagram Logo
          if (config.logoStyle !== 'none') {
            const logoSize = cellSize * 7;
            const logoX = qrStartX + (centerCell - 3) * cellSize;
            const logoY = qrStartY + (centerCell - 3) * cellSize;
            drawInstagramLogo(ctx, logoX, logoY, logoSize, config.logoStyle, gradientColors, isDarkCardBox, angle);
          }

          // F. Draw Instagram Username
          if (config.showUsername) {
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Text shadow for high contrast on light gradients
            ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;

            ctx.font = 'bold 26px "Inter", sans-serif';
            const displayUsername = usernameClean ? `@${usernameClean.toUpperCase()}` : '@INSTAGRAM';
            ctx.fillText(displayUsername, width / 2, qrBoxY + qrBoxSize + 45);
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
          }

          // G. Draw Instruction Text
          if (config.showInstruction) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = 'normal 13px "Inter", sans-serif';

            const text = config.instructionText || 'As pessoas podem ler esse QR code com a câmera do smartphone para ver o perfil.';
            
            // Wrap text to fit the card
            const maxWidth = width * 0.8;
            const words = text.split(' ');
            let line = '';
            let lineCount = 0;
            let currentY = qrBoxY + qrBoxSize + (config.showUsername ? 75 : 40);

            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              const testWidth = metrics.width;
              if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, width / 2, currentY);
                line = words[n] + ' ';
                currentY += 18;
                lineCount++;
              } else {
                line = testLine;
              }
            }
            ctx.fillText(line, width / 2, currentY);
          }

        } else {
          // --- QR ONLY MODE ---
          // Just the QR code, possibly styled with the chosen gradient inside the modules

          const qrPadding = width * 0.08;
          const qrDrawSize = width - qrPadding * 2;
          const cellSize = qrDrawSize / matrixSize;
          const qrStartX = qrPadding;
          const qrStartY = qrPadding;

          const isDarkBg = config.qrBgColor === '#111827' || config.qrBgColor === '#000000';

          // Fill Canvas Background
          if (config.qrBgColor !== 'transparent') {
            ctx.fillStyle = config.qrBgColor;
            ctx.fillRect(0, 0, width, height);
          }

          const angle = config.gradientAngle ?? 45;

          // Set QR module color with automatic inversion to white on dark background
          let finalQRColor: string | CanvasGradient = config.qrColor || '#111827';
          if (isDarkBg && (finalQRColor === '#111827' || finalQRColor === '#000000')) {
            finalQRColor = '#FFFFFF';
          }
          if (config.qrColor === 'gradient') {
            finalQRColor = createAngledGradient(ctx, qrStartX, qrStartY, qrDrawSize, qrDrawSize, angle, gradientColors);
          }

          ctx.fillStyle = finalQRColor;

          const centerCell = Math.floor(matrixSize / 2);
          const logoCellRadius = 3; // 7x7 cell area

          for (let row = 0; row < matrixSize; row++) {
            for (let col = 0; col < matrixSize; col++) {
              // 1. Skip Finder Patterns
              const isTopLeftFinder = row < 7 && col < 7;
              const isTopRightFinder = row < 7 && col >= matrixSize - 7;
              const isBottomLeftFinder = row >= matrixSize - 7 && col < 7;

              if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
                continue;
              }

              // 2. Skip Logo Area
              const isLogoArea = config.logoStyle !== 'none' &&
                row >= centerCell - logoCellRadius && row <= centerCell + logoCellRadius &&
                col >= centerCell - logoCellRadius && col <= centerCell + logoCellRadius;

              if (isLogoArea) continue;

              // 3. Draw standard modules
              if (modules.get(row, col)) {
                const x = qrStartX + col * cellSize;
                const y = qrStartY + row * cellSize;

                if (config.qrStyle === 'dots') {
                  ctx.beginPath();
                  ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 * 0.85, 0, 2 * Math.PI);
                  ctx.fill();

                  if (config.contrastDots) {
                    const dotInnerBg = config.qrBgColor === '#111827' || config.qrBgColor === '#000000' ? '#111827' : '#FFFFFF';
                    const dotCenterFill = dotInnerBg === '#FFFFFF' ? '#111827' : '#FFFFFF';

                    ctx.fillStyle = dotInnerBg;
                    ctx.beginPath();
                    ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 * 0.4, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.fillStyle = dotCenterFill;
                    ctx.beginPath();
                    ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 2 * 0.18, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.fillStyle = finalQRColor;
                  }
                } else if (config.qrStyle === 'rounded') {
                  drawRoundedRect(ctx, x + 0.5, y + 0.5, cellSize - 1, cellSize - 1, cellSize * 0.35);
                  ctx.fill();

                  if (config.contrastDots) {
                    const dotInnerBg = config.qrBgColor === '#111827' || config.qrBgColor === '#000000' ? '#111827' : '#FFFFFF';
                    const dotCenterFill = dotInnerBg === '#FFFFFF' ? '#111827' : '#FFFFFF';

                    ctx.fillStyle = dotInnerBg;
                    drawRoundedRect(ctx, x + cellSize * 0.3, y + cellSize * 0.3, cellSize * 0.4, cellSize * 0.4, cellSize * 0.1);
                    ctx.fill();

                    ctx.fillStyle = dotCenterFill;
                    drawRoundedRect(ctx, x + cellSize * 0.4, y + cellSize * 0.4, cellSize * 0.2, cellSize * 0.2, cellSize * 0.05);
                    ctx.fill();

                    ctx.fillStyle = finalQRColor;
                  }
                } else {
                  ctx.fillRect(x, y, cellSize, cellSize);

                  if (config.contrastDots) {
                    const dotInnerBg = config.qrBgColor === '#111827' || config.qrBgColor === '#000000' ? '#111827' : '#FFFFFF';
                    const dotCenterFill = dotInnerBg === '#FFFFFF' ? '#111827' : '#FFFFFF';

                    ctx.fillStyle = dotInnerBg;
                    ctx.fillRect(x + cellSize * 0.3, y + cellSize * 0.3, cellSize * 0.4, cellSize * 0.4);
                    
                    ctx.fillStyle = dotCenterFill;
                    ctx.fillRect(x + cellSize * 0.4, y + cellSize * 0.4, cellSize * 0.2, cellSize * 0.2);

                    ctx.fillStyle = finalQRColor;
                  }
                }
              }
            }
          }

          // D. Draw Finder Patterns (Eyes)
          let eyeColor = finalQRColor;
          if (isDarkBg && (eyeColor === '#111827' || eyeColor === '#000000')) {
            eyeColor = '#FFFFFF';
          }
          if (config.contrastEyes) {
            eyeColor = isDarkBg ? '#FFFFFF' : '#111827';
          }
          const finderBg = config.qrBgColor === 'transparent' ? '#FFFFFF' : config.qrBgColor;
          drawFinderPattern(ctx, qrStartX, qrStartY, cellSize, eyeColor, finderBg); // Top-left
          drawFinderPattern(ctx, qrStartX + (matrixSize - 7) * cellSize, qrStartY, cellSize, eyeColor, finderBg); // Top-right
          drawFinderPattern(ctx, qrStartX, qrStartY + (matrixSize - 7) * cellSize, cellSize, eyeColor, finderBg); // Bottom-left

          // E. Draw Central Instagram Logo
          if (config.logoStyle !== 'none') {
            const logoSize = cellSize * 7;
            const logoX = qrStartX + (centerCell - 3) * cellSize;
            const logoY = qrStartY + (centerCell - 3) * cellSize;
            drawInstagramLogo(ctx, logoX, logoY, logoSize, config.logoStyle, gradientColors, isDarkBg, angle);
          }
        }

        if (onCanvasReady) {
          onCanvasReady(canvas);
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Erro ao gerar o código QR.');
      } finally {
        setIsGenerating(false);
      }
    };

    generateQR();
  }, [config, onCanvasReady]);

  // Set the canvas dimensions based on chosen type
  const canvasWidth = config.qrType === 'card' ? 460 : 460;
  const canvasHeight = config.qrType === 'card' ? 600 : 460;

  return (
    <div className="relative flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-inner overflow-hidden max-w-full">
      {isGenerating && (
        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center z-10 backdrop-blur-xs transition-opacity duration-200">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Gerando QR Code...</p>
          </div>
        </div>
      )}

      {error ? (
        <div className="text-center p-6 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-100 dark:border-red-900 max-w-sm">
          <p className="text-red-600 dark:text-red-400 font-medium mb-1">Ops! Ocorreu um erro</p>
          <p className="text-xs text-red-500 dark:text-red-500">{error}</p>
        </div>
      ) : (
        <div className="relative group transition-all duration-300 hover:scale-[1.01] max-w-full flex justify-center">
          <canvas
            ref={canvasRef}
            width={canvasWidth * 1.5} // Render higher resolution for crisp display and download
            height={canvasHeight * 1.5}
            className="rounded-2xl shadow-xl w-full max-w-[340px] md:max-w-[380px] bg-white border border-gray-100 dark:border-gray-800 transition-shadow duration-300 group-hover:shadow-2xl"
            style={{
              aspectRatio: `${canvasWidth} / ${canvasHeight}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
