import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Instagram, 
  Download, 
  Sparkles, 
  Check, 
  QrCode, 
  Share2, 
  Copy, 
  Info, 
  Settings, 
  Sliders, 
  Maximize2, 
  HelpCircle, 
  Heart,
  Palette,
  FileText,
  User,
  Layout,
  Type,
  Compass
} from 'lucide-react';
import { QRConfig, INSTAGRAM_GRADIENTS, QRStyle, LogoStyle, QRType } from './types';
import InstagramQRCanvas from './components/InstagramQRCanvas';
import { downloadSVG, downloadPDF } from './utils/exportUtils';

export default function App() {
  // Main state holding all the configuration options
  const [config, setConfig] = useState<QRConfig>({
    username: 'insta.criativo',
    styleId: 'classic',
    customColor1: '#FF007A',
    customColor2: '#7B2CBF',
    qrType: 'card',
    qrColor: '#111827',
    qrBgColor: '#FFFFFF',
    qrStyle: 'rounded',
    logoStyle: 'classic',
    showUsername: true,
    showInstruction: true,
    instructionText: 'As pessoas podem ler esse QR code com a câmera do smartphone para ver seu perfil.',
    size: 1024,
    contrastDots: false,
    contrastEyes: false,
    gradientAngle: 45
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'style' | 'design' | 'options'>('profile');
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'svg' | 'pdf'>('png');
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Suggested user handles for quick preview
  const suggestions = [
    'gourmet.burger',
    'fit_academy',
    'makeup.studio',
    'tech_innovations',
    'minimal.home'
  ];

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    activeCanvasRef.current = canvas;
  }, []);

  // Surprise Me - Custom Color Randomizer
  const handleSurpriseMe = () => {
    const hexChars = '0123456789ABCDEF';
    const getRandomColor = () => {
      let color = '#';
      for (let i = 0; i < 6; i++) {
        color += hexChars[Math.floor(Math.random() * 16)];
      }
      return color;
    };

    setConfig(prev => ({
      ...prev,
      styleId: 'custom',
      customColor1: getRandomColor(),
      customColor2: getRandomColor()
    }));
  };

  // Handle QR Background color change and automatically invert dots/pixels to white when dark
  const handleBgColorChange = (newBg: string) => {
    const isDark = newBg === '#111827' || newBg === '#000000';
    setConfig(prev => {
      let newQRColor = prev.qrColor;
      let newLogoStyle = prev.logoStyle;
      if (isDark) {
        // Automatically invert dots/pixels to white if they were dark
        if (prev.qrColor === '#111827' || prev.qrColor === '#000000') {
          newQRColor = '#FFFFFF';
        }
        if (prev.logoStyle === 'dark') {
          newLogoStyle = 'white';
        }
      } else if (newBg === '#FFFFFF') {
        // If returning to white background and dots were white, revert to dark
        if (prev.qrColor === '#FFFFFF') {
          newQRColor = '#111827';
        }
        if (prev.logoStyle === 'white') {
          newLogoStyle = 'classic';
        }
      }
      return {
        ...prev,
        qrBgColor: newBg,
        qrColor: newQRColor,
        logoStyle: newLogoStyle,
      };
    });
  };

  // Handle QR color selection with automatic background inversion (especially for White QR dots)
  const handleQRColorChange = (newColor: string) => {
    setConfig(prev => {
      let newBg = prev.qrBgColor;
      let newLogoStyle = prev.logoStyle;

      if (newColor === '#FFFFFF') {
        // When user chooses white for the QR dots, invert background to dark to prevent invisible code
        if (newBg === '#FFFFFF' || !newBg) {
          newBg = '#111827';
        }
        if (prev.logoStyle === 'dark') {
          newLogoStyle = 'white';
        }
      } else if (newColor === '#111827' || newColor === '#000000') {
        // When user chooses dark for the QR dots and background is currently dark, revert background to white
        if (newBg === '#111827' || newBg === '#000000') {
          newBg = '#FFFFFF';
        }
        if (prev.logoStyle === 'white') {
          newLogoStyle = 'classic';
        }
      }

      return {
        ...prev,
        qrColor: newColor,
        qrBgColor: newBg,
        logoStyle: newLogoStyle,
      };
    });
  };

  // Copy Profile URL to Clipboard
  const handleCopyLink = () => {
    const cleanUser = config.username.trim().replace(/^@/, '');
    const url = `https://instagram.com/${cleanUser}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download high-resolution PNG from the generated canvas
  const handleDownload = (resolutionMultiplier?: number) => {
    if (!activeCanvasRef.current) return;
    setDownloading(true);

    try {
      const cleanUser = config.username.trim().replace(/^@/, '') || 'instagram';
      const canvas = activeCanvasRef.current;
      
      // Since the preview canvas is already beautifully supersampled at 1.5x resolution (e.g. 690x900px),
      // it provides an extremely crisp, high-quality PNG. We can export this high-res image directly.
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      // Trigger download
      const link = document.createElement('a');
      link.download = `qrjeanerator-${cleanUser}-${config.qrType}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  // Download pure vector SVG
  const handleDownloadSVG = () => {
    setDownloading(true);
    try {
      const cleanUser = config.username.trim().replace(/^@/, '') || 'instagram';
      downloadSVG(config, `qrjeanerator-${cleanUser}-${config.qrType}.svg`);
    } catch (err) {
      console.error('SVG download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  // Download high-resolution print PDF
  const handleDownloadPDF = () => {
    if (!activeCanvasRef.current) return;
    setDownloading(true);
    try {
      const cleanUser = config.username.trim().replace(/^@/, '') || 'instagram';
      downloadPDF(config, activeCanvasRef.current, `qrjeanerator-${cleanUser}-${config.qrType}.pdf`);
    } catch (err) {
      console.error('PDF download failed', err);
    } finally {
      setDownloading(false);
    }
  };

  // Get gradient preview styled background based on styleId and gradientAngle
  const getGradientCSS = (id: string, angle = config.gradientAngle ?? 45) => {
    const grad = INSTAGRAM_GRADIENTS.find(g => g.id === id);
    if (!grad) return '';
    if (id === 'custom') {
      return `linear-gradient(${angle}deg, ${config.customColor1}, ${config.customColor2})`;
    }
    return `linear-gradient(${angle}deg, ${grad.colors.join(', ')})`;
  };

  const activeGradientCSS = getGradientCSS(config.styleId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-[3px] shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
                <Instagram className="w-5 h-5 text-[#dc2743]" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 flex items-center gap-2">
                QRJeanerator <span className="text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-sans">Pro</span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">Gerador de Códigos QR de Alta Fidelidade no Estilo Instagram</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              disabled={!config.username}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg duration-200"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#e1306c] hover:bg-[#e1306c]/5 transition-all duration-200"
            >
              <Instagram className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Configuration Panel */}
        <section className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" /> Personalize seu Código QR
            </h2>
            <p className="text-sm text-slate-500">Configure as informações, as cores clássicas e o design do seu crachá.</p>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-100 p-0.5 bg-slate-50 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'profile'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Perfil</span>
            </button>
            <button
              onClick={() => setActiveTab('style')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'style'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Cores & Fundo</span>
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'design'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Aparência</span>
            </button>
            <button
              onClick={() => setActiveTab('options')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'options'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Layout</span>
            </button>
          </div>

          {/* Active Tab Panels with Transition animations */}
          <div className="min-h-[340px]">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* Username Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Nome de Usuário</label>
                    <div className="relative rounded-xl shadow-xs">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-semibold text-base select-none">
                        @
                      </span>
                      <input
                        type="text"
                        value={config.username}
                        onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                        placeholder="seu.usuario"
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-200"
                      />
                    </div>
                    <p className="text-xs text-slate-400">Insira apenas o seu arroba. Geraremos o link oficial automaticamente.</p>
                  </div>

                  {/* Suggestions list */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Sugestões de Teste</label>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, username: sug }))}
                          className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-indigo-600 font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          @{sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QR Output Format Type */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Formato do QR Code</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, qrType: 'card' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                          config.qrType === 'card'
                            ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 ring-2 ring-indigo-600/10'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Layout className="w-5 h-5" />
                        <div>
                          <p className="text-sm font-bold">Cartão Completo</p>
                          <p className="text-xxs opacity-80 mt-0.5">Estilo crachá com o gradiente e arroba</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, qrType: 'qr-only' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all ${
                          config.qrType === 'qr-only'
                            ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 ring-2 ring-indigo-600/10'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <QrCode className="w-5 h-5" />
                        <div>
                          <p className="text-sm font-bold">Apenas QR Code</p>
                          <p className="text-xxs opacity-80 mt-0.5">Ideal para panfletos, cartazes e artes</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'style' && (
                <motion.div
                  key="style"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* Gradiente Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Gradientes Oficiais e Temas</label>
                      <button
                        type="button"
                        onClick={handleSurpriseMe}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        Surpreenda-me!
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {INSTAGRAM_GRADIENTS.map((gradient) => {
                        const isActive = config.styleId === gradient.id;
                        const gradBg = gradient.id === 'custom' 
                          ? `linear-gradient(to right top, ${config.customColor1}, ${config.customColor2})`
                          : gradient.cssGradient;

                        return (
                          <button
                            key={gradient.id}
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, styleId: gradient.id }))}
                            className={`group relative rounded-xl p-3 border transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                              isActive
                                ? 'border-indigo-600 bg-indigo-50/10 text-indigo-950 ring-2 ring-indigo-600/10 font-semibold'
                                : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <span 
                              className="w-5 h-5 rounded-full border border-black/10 flex-shrink-0" 
                              style={{ backgroundImage: gradBg }} 
                            />
                            <div className="min-w-0">
                              <p className="text-xs truncate font-medium">{gradient.name}</p>
                            </div>
                            {isActive && (
                              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Gradient Options */}
                  {config.styleId === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3.5 overflow-hidden"
                    >
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Gradiente Personalizado</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xxs text-slate-500 uppercase tracking-wider font-semibold">Cor Inicial</label>
                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
                            <input
                              type="color"
                              value={config.customColor1}
                              onChange={(e) => setConfig(prev => ({ ...prev, customColor1: e.target.value }))}
                              className="w-8 h-8 rounded border-none cursor-pointer p-0 bg-transparent"
                            />
                            <span className="text-xs font-mono text-slate-600 uppercase">{config.customColor1}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xxs text-slate-500 uppercase tracking-wider font-semibold">Cor Final</label>
                          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
                            <input
                              type="color"
                              value={config.customColor2}
                              onChange={(e) => setConfig(prev => ({ ...prev, customColor2: e.target.value }))}
                              className="w-8 h-8 rounded border-none cursor-pointer p-0 bg-transparent"
                            />
                            <span className="text-xs font-mono text-slate-600 uppercase">{config.customColor2}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Gradient Angle Control */}
                  <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Compass className="w-4 h-4 text-indigo-600" />
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Ângulo do Gradiente
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
                          {config.gradientAngle}°
                        </span>
                        <div 
                          className="w-6 h-6 rounded-full border border-indigo-200 bg-white flex items-center justify-center text-indigo-600 shadow-xs transition-transform duration-150"
                          style={{ transform: `rotate(${config.gradientAngle}deg)` }}
                          title={`Ângulo: ${config.gradientAngle}°`}
                        >
                          <span className="text-xs font-bold select-none leading-none">↑</span>
                        </div>
                      </div>
                    </div>

                    {/* Angle Slider */}
                    <div className="space-y-1.5">
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="5"
                        value={config.gradientAngle}
                        onChange={(e) => setConfig(prev => ({ ...prev, gradientAngle: Number(e.target.value) }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5">
                        <span>0° (Topo)</span>
                        <span>90° (Direita)</span>
                        <span>180° (Baixo)</span>
                        <span>270° (Esquerda)</span>
                        <span>360°</span>
                      </div>
                    </div>

                    {/* Quick Angle Preset Buttons */}
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {[
                        { angle: 45, label: '45°', desc: 'Diagonal' },
                        { angle: 90, label: '90°', desc: 'Horizontal' },
                        { angle: 135, label: '135°', desc: 'Invertido' },
                        { angle: 180, label: '180°', desc: 'Vertical' },
                        { angle: 0, label: '0°', desc: 'Para Cima' }
                      ].map((preset) => (
                        <button
                          key={preset.angle}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, gradientAngle: preset.angle }))}
                          className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                            config.gradientAngle === preset.angle
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span className="block text-xs font-semibold">{preset.label}</span>
                          <span className="block text-[9px] text-slate-400 truncate">{preset.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QR Background Option (available for Card QR Box and QR-Only mode) */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {config.qrType === 'card' ? 'Fundo da Caixa do QR' : 'Cor de Fundo do QR Code'}
                      </label>
                      {config.qrBgColor === '#111827' && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          Bolinhas brancas ativadas ✨
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2.5">
                      {[
                        { id: '#FFFFFF', name: 'Branco' },
                        ...(config.qrType === 'qr-only' ? [{ id: 'transparent', name: 'Transparente' }] : []),
                        { id: '#111827', name: 'Escuro' }
                      ].map((bgOpt) => (
                        <button
                          key={bgOpt.id}
                          type="button"
                          onClick={() => handleBgColorChange(bgOpt.id)}
                          className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                            config.qrBgColor === bgOpt.id
                              ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {bgOpt.name}
                        </button>
                      ))}
                    </div>
                    {config.qrBgColor === '#111827' && (
                      <p className="text-[11px] text-slate-500 italic">
                        Ao selecionar fundo escuro, os pontos e âncoras se invertem para branco para garantir leitura instantânea.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'design' && (
                <motion.div
                  key="design"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* QR Pixel Shape Style */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Estilo dos Pixels do QR Code</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'squares', name: 'Quadrado', desc: 'Clássico' },
                        { id: 'rounded', name: 'Arredondado', desc: 'Moderno' },
                        { id: 'dots', name: 'Círculos', desc: 'Orgânico' }
                      ].map((styleOpt) => (
                        <button
                          key={styleOpt.id}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, qrStyle: styleOpt.id as QRStyle }))}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            config.qrStyle === styleOpt.id
                              ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 ring-2 ring-indigo-600/10'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <p className="text-xs font-bold">{styleOpt.name}</p>
                          <p className="text-[10px] opacity-75">{styleOpt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Center Instagram Logo Style */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Logotipo no Centro</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'classic', name: 'Colorido', desc: 'Sunset original' },
                        { id: 'white', name: 'Branco', desc: 'Visual escuro' },
                        { id: 'dark', name: 'Escuro', desc: 'Minimalista' },
                        { id: 'none', name: 'Sem Logo', desc: 'QR limpo' }
                      ].map((logoOpt) => (
                        <button
                          key={logoOpt.id}
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, logoStyle: logoOpt.id as LogoStyle }))}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            config.logoStyle === logoOpt.id
                              ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 ring-2 ring-indigo-600/10'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <p className="text-xs font-bold truncate">{logoOpt.name}</p>
                          <p className="text-[9px] opacity-75 truncate">{logoOpt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QR Core Color Selection */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Cor do QR Code</label>
                      {config.qrColor === '#FFFFFF' && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          Fundo invertido para escuro ✨
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { id: '#111827', name: 'Escuro' },
                        { id: '#FFFFFF', name: 'Branco' },
                        { id: '#000000', name: 'Preto Puro' },
                        { id: '#1D4ED8', name: 'Azul' },
                        { id: 'gradient', name: 'Gradiente' }
                      ].map((colorOpt) => {
                        const isSelected = config.qrColor === colorOpt.id;
                        return (
                          <button
                            key={colorOpt.id}
                            type="button"
                            onClick={() => handleQRColorChange(colorOpt.id)}
                            className={`p-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700 font-bold shadow-xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1.5">
                              {colorOpt.id === '#FFFFFF' && (
                                <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shadow-xs inline-block" />
                              )}
                              {colorOpt.id === '#111827' && (
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 inline-block" />
                              )}
                              {colorOpt.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {config.qrColor === '#FFFFFF' && (
                      <p className="text-[11px] text-slate-500 italic">
                        Ao selecionar bolinhas brancas, o fundo do QR inverte automaticamente para escuro para manter o contraste perfeito.
                      </p>
                    )}
                    {config.qrColor !== 'gradient' && config.qrColor !== '#111827' && config.qrColor !== '#FFFFFF' && config.qrColor !== '#000000' && config.qrColor !== '#1D4ED8' && (
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs text-slate-500">Selecione outra cor:</label>
                        <input
                          type="color"
                          value={config.qrColor}
                          onChange={(e) => handleQRColorChange(e.target.value)}
                          className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0 bg-transparent"
                        />
                      </div>
                    )}
                  </div>

                  {/* Legibilidade e Contraste */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Legibilidade e Contraste</label>
                    
                    <div className="space-y-2">
                      {/* Contrast Dots */}
                      <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-xs font-bold text-slate-800 block">Destaque de Contraste nos Pontos</span>
                          <span className="text-[11px] text-slate-500 leading-normal block">
                            Adiciona detalhes internos e anéis de contraste nos pixels (perfeito para o estilo de Círculos/Dots).
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={config.contrastDots}
                            onChange={(e) => setConfig(prev => ({ ...prev, contrastDots: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* Contrast Eyes */}
                      <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-xs font-bold text-slate-800 block">Olhos/Âncoras de Alto Contraste</span>
                          <span className="text-[11px] text-slate-500 leading-normal block">
                            Força as três âncoras dos cantos a terem cor escura sólida para garantir escaneamento instantâneo.
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={config.contrastEyes}
                            onChange={(e) => setConfig(prev => ({ ...prev, contrastEyes: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'options' && (
                <motion.div
                  key="options"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {config.qrType === 'card' ? (
                    <>
                      {/* Show Username Toggle */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="space-y-0.5">
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">Mostrar nome @usuario</label>
                          <span className="text-xs text-slate-400">Exibe o arroba do seu Instagram abaixo do código.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.showUsername}
                            onChange={(e) => setConfig(prev => ({ ...prev, showUsername: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* Show Instruction Toggle */}
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="space-y-0.5">
                          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">Mostrar legenda de instrução</label>
                          <span className="text-xs text-slate-400">Ajuda as pessoas a saberem que devem escanear.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.showInstruction}
                            onChange={(e) => setConfig(prev => ({ ...prev, showInstruction: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {/* Customize Instruction Text */}
                      {config.showInstruction && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5"
                        >
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Texto da Legenda</label>
                          <textarea
                            value={config.instructionText}
                            onChange={(e) => setConfig(prev => ({ ...prev, instructionText: e.target.value }))}
                            maxLength={120}
                            rows={3}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-200"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Escreva uma chamada para ação personalizada</span>
                            <span>{config.instructionText.length}/120</span>
                          </div>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Layout className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-semibold text-slate-600">Apenas para Modo Cartão</p>
                      <p className="text-xs text-slate-400">No formato "Apenas QR Code", textos e legendas são desabilitados para que você tenha um arquivo limpo do código QR.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick tips about high contrast & design */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex gap-3 text-amber-800">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold font-display uppercase tracking-wide">Dica de Legibilidade</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                Assegure que haja um bom contraste entre os pixels e o fundo. Se utilizar "Apenas QR Code" transparente, salve o código com cores escuras caso vá colocá-lo sobre superfícies claras.
              </p>
            </div>
          </div>
        </section>

        {/* Right column: Live Preview, Download & Guide */}
        <section className="lg:col-span-5 flex flex-col gap-6 sticky top-[92px]">
          
          {/* Live Preview Card Wrapper */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 flex flex-col items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 self-start">Visualização em Tempo Real</h3>
            
            {/* The actual Canvas Component wrapper */}
            <InstagramQRCanvas config={config} onCanvasReady={handleCanvasReady} />

            {/* Downloader Settings & Actions with PNG, SVG and PDF */}
            <div className="w-full mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Formato de Exportação</span>
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Alta Fidelidade
                </span>
              </div>

              {/* Format Tabs: PNG | SVG | PDF */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setDownloadFormat('png')}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    downloadFormat === 'png'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDownloadFormat('svg')}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    downloadFormat === 'svg'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>SVG</span>
                  <span className="text-[9px] px-1 py-0.2 bg-indigo-50 rounded text-indigo-600 font-mono">Vetor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDownloadFormat('pdf')}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    downloadFormat === 'pdf'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PDF</span>
                  <span className="text-[9px] px-1 py-0.2 bg-emerald-50 rounded text-emerald-700 font-mono">Print</span>
                </button>
              </div>

              {/* PNG Actions */}
              {downloadFormat === 'png' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(1.5)}
                      disabled={downloading}
                      className="flex items-center justify-center gap-2 py-3 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer duration-200"
                    >
                      <Download className="w-4 h-4" />
                      <span>PNG Padrão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(3)}
                      disabled={downloading}
                      className="flex items-center justify-center gap-2 py-3 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer duration-200"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>PNG Ultra HD</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Ideal para postar no feed, stories, WhatsApp ou exibição em telas digitais.
                  </p>
                </div>
              )}

              {/* SVG Actions */}
              {downloadFormat === 'svg' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleDownloadSVG}
                    disabled={downloading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer duration-200"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Baixar Arquivo SVG (Vetor Infinito)</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">
                    Vetor 100% nítido sem pixels. Compatível com Illustrator, CorelDRAW, Figma e cortes a laser em qualquer tamanho.
                  </p>
                </div>
              )}

              {/* PDF Actions */}
              {downloadFormat === 'pdf' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={downloading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer duration-200"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Baixar PDF para Impressão (Folha A4)</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">
                    Arquivo em alta resolução pronto para gráfica rápida ou impressora doméstica, com guias de recorte para balcões e displays.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick scanning tips & printing guidelines */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-500" /> Guia Prático de Impressão e Uso
            </h3>

            <ul className="space-y-3.5">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">Onde posicionar seu QR Code?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Coloque em balcões de recepção, embalagens de delivery, sacolas de produtos, vitrines de lojas ou cartões de visita físicos.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">Tamanho ideal para impressão</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Para displays de mesa ou vitrines, imprima o crachá em um tamanho mínimo de 8cm x 10cm. Para adesivos em caixas, 5cm x 5cm é excelente.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0 mt-0.5">
                  3
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800">Como testar antes de divulgar?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sempre faça um escaneamento de teste diretamente com a câmera de outros smartphones na tela do seu computador antes de enviar para a gráfica.
                  </p>
                </div>
              </li>
            </ul>
          </div>

        </section>

      </main>

      {/* Simple elegant footer */}
      <footer className="mt-auto bg-white border-t border-slate-100 py-6 px-6 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} QRJeanerator. Todos os direitos reservados.</p>
          <p className="flex items-center justify-center gap-1">
            Feito com <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> por Jean Pierre para criadores do Instagram
          </p>
        </div>
      </footer>
    </div>
  );
}
