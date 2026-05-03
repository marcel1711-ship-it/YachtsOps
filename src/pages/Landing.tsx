import React, { useState, useEffect, useRef } from 'react';
import {
  Anchor,
  ChevronDown,
  Wrench,
  Package,
  Fuel,
  BookOpen,
  Users,
  BarChart3,
  Bell,
  ArrowRight,
  Menu,
  X,
  Check,
  Star,
  Globe,
  Shield,
  MapPin,
  Clock,
  Zap,
} from 'lucide-react';

interface LandingProps {
  onEnterApp: () => void;
}

type Lang = 'en' | 'es';

const T = {
  en: {
    nav: {
      features: 'Features',
      howItWorks: 'How it works',
      forWho: "Who it's for",
      contact: 'Contact',
      signIn: 'Sign in',
      requestDemo: 'Request Demo',
    },
    hero: {
      badge: 'Vessel Operations Platform',
      h1a: 'Every vessel.',
      h1b: 'Under control.',
      sub: 'The professional platform for yacht owners, fleet managers, and marine maintenance companies. Maintenance, inventory, fuel, and documentation — unified.',
      cta: 'Request a Demo',
      ctaSecondary: 'Sign in',
    },
    stats: [
      { val: 'All-in-one', label: 'Maintenance, inventory & fuel' },
      { val: 'Real-time', label: 'Alerts & notifications' },
      { val: 'Any device', label: 'Works at sea or ashore' },
    ],
    features: {
      badge: 'Platform capabilities',
      title: 'Everything your vessel needs',
      sub: 'Built by people who understand what happens below deck, not just in the boardroom.',
      items: [
        { title: 'Fleet Management', desc: 'Centralize every vessel in your fleet. Track specs, documents, photos, and crew from a single command center.' },
        { title: 'Preventive Maintenance', desc: 'Schedule and track maintenance tasks with due-date alerts. Never miss a critical service interval again.' },
        { title: 'Inventory Control', desc: 'Real-time stock levels across all locations onboard. QR-code scanning for instant adjustments at sea.' },
        { title: 'Fuel & Consumables', desc: 'Log every fuel entry, track consumption trends, and optimize bunkering decisions with historical data.' },
        { title: 'Digital Manuals', desc: 'Upload and organize technical manuals by vessel and equipment. Always accessible, never misplaced.' },
        { title: 'Smart Alerts', desc: 'Automated email notifications for overdue tasks, low stock, and critical maintenance reminders.' },
        { title: 'Multi-User Access', desc: 'Role-based permissions for captains, engineers, and fleet managers. Everyone sees exactly what they need.' },
        { title: 'Maintenance History', desc: 'Complete audit trail of every task, part used, and service performed. Full traceability at all times.' },
      ],
    },
    howItWorks: {
      badge: 'Simple process',
      title: 'Up and running in hours',
      steps: [
        { num: '01', title: 'Register your fleet', desc: 'Add your vessels with all technical details, photos, and documentation in minutes.' },
        { num: '02', title: 'Configure your team', desc: 'Invite crew members and managers. Assign roles and set access permissions per vessel.' },
        { num: '03', title: 'Operate with full control', desc: 'Log maintenance, manage inventory, track fuel, and receive alerts — all in one place.' },
      ],
    },
    forWho: {
      badge: 'Tailored for',
      title: 'Built for the people who run vessels',
      profiles: [
        { title: 'Vessel Owners', desc: 'Protect your investment. Know the exact state of your vessel at all times — maintenance history, stock levels, fuel logs — without scattered spreadsheets.' },
        { title: 'Fleet & Charter Managers', desc: 'Manage multiple vessels from a single dashboard. Standardize operations, reduce downtime, and deliver a consistent experience to every guest and owner.' },
        { title: 'Maintenance Companies', desc: 'Track every task, part, and service record across your entire client portfolio. Respond faster, invoice with precision, and build lasting trust.' },
      ],
    },
    testimonials: {
      badge: 'Trusted by professionals',
      title: 'From those who know best',
      items: [
        { quote: 'YachtOps transformed how we manage our 60m motor yacht. Maintenance is now proactive, not reactive.', name: 'Captain R. Morales', role: 'Chief Officer, M/Y Adriatica', stars: 5 },
        { quote: "The inventory QR system alone saved us hours every provisioning run. Our chief stew won't go back.", name: 'Thomas Ecklund', role: 'Fleet Manager, Nordic Charter Group', stars: 5 },
        { quote: 'Finally a platform built for people who actually work on yachts, not just for accountants.', name: 'Chief Engineer S. Devaux', role: 'M/Y Belle Epoque, 78m', stars: 5 },
      ],
    },
    trust: {
      label: 'Built for demanding operations',
      items: [
        { label: 'Enterprise security', sub: 'SOC 2 compliant' },
        { label: 'Available worldwide', sub: 'Any port, any ocean' },
        { label: 'Real-time alerts', sub: 'Email notifications' },
        { label: 'Unlimited crew', sub: 'Role-based access' },
      ],
    },
    cta: {
      title: 'Ready to take command?',
      sub: "Whether you own one vessel or manage a full fleet, stop relying on spreadsheets. Run a tighter operation starting today.",
      btn: 'Request a Demo',
      btnSecondary: 'Sign in',
    },
    contact: {
      badge: 'Get started',
      title: 'Request a Demo',
      sub: "Tell us about your fleet and we'll reach out within 24 hours to schedule a personalized walkthrough.",
      name: 'Full name',
      namePlaceholder: 'Captain John Smith',
      email: 'Email',
      emailPlaceholder: 'captain@vessel.com',
      fleetType: 'Fleet type',
      fleetSelect: 'Select fleet type',
      fleetOptions: [
        { value: 'private', label: 'Private superyacht' },
        { value: 'charter', label: 'Charter operation' },
        { value: 'fleet', label: 'Fleet management company' },
        { value: 'other', label: 'Other' },
      ],
      message: 'Message (optional)',
      messagePlaceholder: 'Tell us about your vessel or fleet...',
      send: 'Send request',
      successTitle: 'Request received',
      successSub: "We'll be in touch within 24 hours. In the meantime, feel free to sign in and explore.",
      exploreBtn: 'Explore the app',
    },
    footer: {
      desc: 'The professional operations platform for serious yacht and fleet management.',
      platform: 'Platform',
      account: 'Account',
      links: [
        ['Features', '#features'],
        ['How it works', '#how-it-works'],
        ['For who', '#for-who'],
      ],
      signIn: 'Sign in',
      requestDemo: 'Request demo',
      rights: 'All rights reserved.',
    },
    scroll: 'Scroll',
  },
  es: {
    nav: {
      features: 'Funciones',
      howItWorks: 'Cómo funciona',
      forWho: 'Para quién',
      contact: 'Contacto',
      signIn: 'Iniciar sesión',
      requestDemo: 'Solicitar Demo',
    },
    hero: {
      badge: 'Plataforma de Operaciones Navales',
      h1a: 'Cada embarcación.',
      h1b: 'Bajo control.',
      sub: 'La plataforma profesional para propietarios de yates, gestores de flotas y empresas de mantenimiento marino. Mantenimiento, inventario, combustible y documentación — unificados.',
      cta: 'Solicitar Demo',
      ctaSecondary: 'Iniciar sesión',
    },
    stats: [
      { val: 'Todo en uno', label: 'Mantenimiento, inventario y combustible' },
      { val: 'Tiempo real', label: 'Alertas y notificaciones' },
      { val: 'Cualquier dispositivo', label: 'En mar o en tierra' },
    ],
    features: {
      badge: 'Capacidades de la plataforma',
      title: 'Todo lo que tu embarcación necesita',
      sub: 'Construido por quienes conocen lo que ocurre bajo cubierta, no solo en la sala de juntas.',
      items: [
        { title: 'Gestión de Flota', desc: 'Centraliza cada embarcación. Ficha técnica, documentos, fotos y tripulación desde un solo panel.' },
        { title: 'Mantenimiento Preventivo', desc: 'Programa y rastrea tareas con alertas de vencimiento. Nunca más pierdas un intervalo de servicio crítico.' },
        { title: 'Control de Inventario', desc: 'Niveles de stock en tiempo real a bordo. Escaneo QR para ajustes inmediatos en alta mar.' },
        { title: 'Combustible y Consumibles', desc: 'Registra cada carga de combustible, analiza el consumo y optimiza el avituallamiento con datos históricos.' },
        { title: 'Manuales Digitales', desc: 'Sube y organiza manuales técnicos por embarcación y equipo. Siempre accesibles, nunca extraviados.' },
        { title: 'Alertas Inteligentes', desc: 'Notificaciones automáticas por email para tareas vencidas, stock bajo y recordatorios de mantenimiento.' },
        { title: 'Acceso Multi-usuario', desc: 'Permisos por rol para capitanes, ingenieros y gestores. Cada uno ve exactamente lo que necesita.' },
        { title: 'Historial de Mantenimiento', desc: 'Registro completo de cada tarea, pieza y servicio realizado. Trazabilidad total en todo momento.' },
      ],
    },
    howItWorks: {
      badge: 'Proceso simple',
      title: 'Operativo en pocas horas',
      steps: [
        { num: '01', title: 'Registra tu flota', desc: 'Añade tus embarcaciones con todos los detalles técnicos, fotos y documentación en minutos.' },
        { num: '02', title: 'Configura tu equipo', desc: 'Invita a tripulantes y gestores. Asigna roles y permisos de acceso por embarcación.' },
        { num: '03', title: 'Opera con control total', desc: 'Registra mantenimientos, gestiona inventario, controla combustible y recibe alertas — todo en un lugar.' },
      ],
    },
    forWho: {
      badge: 'Diseñado para',
      title: 'Hecho para quienes operan embarcaciones',
      profiles: [
        { title: 'Propietarios de Yates', desc: 'Protege tu inversión. Conoce el estado exacto de tu embarcación en todo momento — historial, stock, combustible — sin hojas de cálculo dispersas.' },
        { title: 'Gestores de Flota y Charter', desc: 'Gestiona múltiples embarcaciones desde un único panel. Estandariza operaciones, reduce paradas y ofrece una experiencia consistente a cada cliente.' },
        { title: 'Empresas de Mantenimiento', desc: 'Rastrea cada tarea, pieza y servicio en toda tu cartera de clientes. Responde más rápido, factura con precisión y construye confianza duradera.' },
      ],
    },
    testimonials: {
      badge: 'Confiado por profesionales',
      title: 'Quienes mejor lo conocen hablan',
      items: [
        { quote: 'YachtOps transformó la gestión de nuestro yate de 60m. El mantenimiento ahora es proactivo, no reactivo.', name: 'Capitán R. Morales', role: 'Oficial Jefe, M/Y Adriatica', stars: 5 },
        { quote: 'El sistema de QR de inventario por sí solo nos ahorra horas en cada aprovisionamiento. No hay vuelta atrás.', name: 'Thomas Ecklund', role: 'Gestor de Flota, Nordic Charter Group', stars: 5 },
        { quote: 'Por fin una plataforma pensada para quienes trabajan en yates de verdad, no solo para contables.', name: 'Jefe de Máquinas S. Devaux', role: 'M/Y Belle Epoque, 78m', stars: 5 },
      ],
    },
    trust: {
      label: 'Diseñado para operaciones exigentes',
      items: [
        { label: 'Seguridad empresarial', sub: 'Cumplimiento SOC 2' },
        { label: 'Disponible en todo el mundo', sub: 'Cualquier puerto, cualquier océano' },
        { label: 'Alertas en tiempo real', sub: 'Notificaciones por email' },
        { label: 'Tripulación ilimitada', sub: 'Acceso por roles' },
      ],
    },
    cta: {
      title: '¿Listo para tomar el mando?',
      sub: 'Tanto si tienes una embarcación como una flota entera, deja atrás las hojas de cálculo. Empieza a operar mejor hoy.',
      btn: 'Solicitar Demo',
      btnSecondary: 'Iniciar sesión',
    },
    contact: {
      badge: 'Empieza ahora',
      title: 'Solicita una Demo',
      sub: 'Cuéntanos sobre tu flota y nos pondremos en contacto en menos de 24 horas para una sesión personalizada.',
      name: 'Nombre completo',
      namePlaceholder: 'Capitán Juan García',
      email: 'Correo electrónico',
      emailPlaceholder: 'capitan@embarcacion.com',
      fleetType: 'Tipo de flota',
      fleetSelect: 'Selecciona el tipo de flota',
      fleetOptions: [
        { value: 'private', label: 'Superyate privado' },
        { value: 'charter', label: 'Operación de charter' },
        { value: 'fleet', label: 'Empresa de gestión de flotas' },
        { value: 'other', label: 'Otro' },
      ],
      message: 'Mensaje (opcional)',
      messagePlaceholder: 'Cuéntanos sobre tu embarcación o flota...',
      send: 'Enviar solicitud',
      successTitle: 'Solicitud recibida',
      successSub: 'Nos pondremos en contacto en menos de 24 horas. Mientras tanto, puedes explorar la app.',
      exploreBtn: 'Explorar la app',
    },
    footer: {
      desc: 'La plataforma profesional de operaciones para la gestión seria de yates y flotas.',
      platform: 'Plataforma',
      account: 'Cuenta',
      links: [
        ['Funciones', '#features'],
        ['Cómo funciona', '#how-it-works'],
        ['Para quién', '#for-who'],
      ],
      signIn: 'Iniciar sesión',
      requestDemo: 'Solicitar demo',
      rights: 'Todos los derechos reservados.',
    },
    scroll: 'Bajar',
  },
};

const FEATURE_ICONS = [Anchor, Wrench, Package, Fuel, BookOpen, Bell, Users, BarChart3];
const TRUST_ICONS = [Shield, Globe, Bell, Users];
const PROFILE_IMGS = [
  'https://images.pexels.com/photos/8886818/pexels-photo-8886818.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/15452603/pexels-photo-15452603.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/10642986/pexels-photo-10642986.jpeg?auto=compress&cs=tinysrgb&w=800',
];

export const Landing: React.FC<LandingProps> = ({ onEnterApp }) => {
  const [lang, setLang] = useState<Lang>('en');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', fleet: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const t = T[lang];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const navLinks = [
    { label: t.nav.features, href: '#features' },
    { label: t.nav.howItWorks, href: '#how-it-works' },
    { label: t.nav.forWho, href: '#for-who' },
    { label: t.nav.contact, href: '#contact' },
  ];

  return (
    <div className="min-h-screen bg-[#05111e] text-white font-sans overflow-x-hidden">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(14,116,144,0.07),transparent_70%)]" />
        <div className="absolute top-1/2 -right-60 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(2,132,199,0.05),transparent_70%)]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(14,116,144,0.04),transparent_70%)]" />
      </div>

      {/* ── NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#05111e]/95 backdrop-blur-2xl border-b border-white/[0.07] py-3 shadow-2xl shadow-black/40'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Anchor size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Yacht<span className="text-cyan-400">Ops</span>
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="text-sm text-white/50 hover:text-white tracking-wide transition-colors duration-200 font-medium"
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
              className="flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/80 border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-full transition-all duration-200 mr-2"
            >
              <Globe size={12} />
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
            <button
              onClick={onEnterApp}
              className="text-sm text-white/50 hover:text-white px-4 py-2 transition-colors duration-200 font-medium"
            >
              {t.nav.signIn}
            </button>
            <button
              onClick={() => scrollTo('#contact')}
              className="text-sm bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-px"
            >
              {t.nav.requestDemo}
            </button>
          </div>

          <button
            className="md:hidden text-white/60 hover:text-white transition-colors"
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#05111e]/98 backdrop-blur-2xl border-t border-white/[0.07] px-6 py-5 flex flex-col gap-4">
            {navLinks.map(l => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="text-left text-white/50 hover:text-white py-1 text-sm tracking-wide transition-colors font-medium"
              >
                {l.label}
              </button>
            ))}
            <hr className="border-white/[0.08]" />
            <button
              onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
              className="flex items-center gap-2 text-white/40 hover:text-white text-sm py-1 transition-colors font-medium w-fit"
            >
              <Globe size={14} />
              {lang === 'en' ? 'Español' : 'English'}
            </button>
            <button onClick={onEnterApp} className="text-left text-white/50 hover:text-white text-sm py-1 transition-colors font-medium">{t.nav.signIn}</button>
            <button
              onClick={() => scrollTo('#contact')}
              className="bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-semibold text-sm py-3 rounded-full shadow-lg shadow-cyan-500/25"
            >
              {t.nav.requestDemo}
            </button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background photo */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/5488927/pexels-photo-5488927.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        />
        {/* Layered overlays for depth and luxury feel */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#05111e]/95 via-[#05111e]/70 to-[#05111e]/40" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#05111e]/60 via-transparent to-[#05111e]/90" />
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_50%_80%_at_15%_50%,rgba(14,116,144,0.18),transparent_70%)]" />

        <div className="relative z-[2] max-w-7xl mx-auto px-6 pt-32 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-cyan-400/20 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs tracking-[0.2em] uppercase text-cyan-300/80 font-semibold">
                {t.hero.badge}
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[4.2rem] font-bold tracking-tight leading-[1.05] mb-6 text-white">
              {t.hero.h1a}<br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                {t.hero.h1b}
              </span>
            </h1>

            <p className="text-lg text-slate-300/60 leading-relaxed mb-10 max-w-xl">
              {t.hero.sub}
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <button
                onClick={() => scrollTo('#contact')}
                className="group flex items-center gap-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold px-8 py-4 rounded-full text-sm tracking-wide transition-all duration-300 shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/45 hover:-translate-y-0.5"
              >
                {t.hero.cta}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onEnterApp}
                className="flex items-center gap-2 border border-white/15 hover:border-white/35 text-white/70 hover:text-white px-8 py-4 rounded-full text-sm tracking-wide transition-all duration-300 hover:bg-white/[0.06] backdrop-blur-sm font-medium"
              >
                {t.hero.ctaSecondary}
              </button>
            </div>

            {/* Stats row */}
            <div className="mt-14 flex items-center gap-10 border-t border-white/[0.08] pt-8">
              {t.stats.map(s => (
                <div key={s.label}>
                  <div className="text-2xl font-bold text-white">{s.val}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-tight max-w-[80px]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side — decorative card preview */}
          <div className="hidden lg:flex justify-end">
            <div className="relative w-[420px]">
              {/* Glow behind card */}
              <div className="absolute inset-0 scale-110 bg-[radial-gradient(ellipse_at_center,rgba(14,116,144,0.2),transparent_70%)]" />
              {/* Main card */}
              <div className="relative bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Fleet Overview</p>
                    <p className="text-white font-bold text-xl">M/Y Adriatica</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                    <Anchor size={18} className="text-cyan-400" />
                  </div>
                </div>
                {/* Mini stat cards */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { icon: Wrench, label: 'Maintenance', val: '3 pending', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { icon: Package, label: 'Inventory', val: '98% stocked', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { icon: Fuel, label: 'Fuel level', val: '72%', color: 'text-sky-400', bg: 'bg-sky-500/10' },
                    { icon: Bell, label: 'Alerts', val: '1 overdue', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                  ].map((item, i) => (
                    <div key={i} className={`${item.bg} rounded-2xl p-4 border border-white/[0.06]`}>
                      <item.icon size={16} className={`${item.color} mb-2`} />
                      <p className="text-white/40 text-[10px] uppercase tracking-wider">{item.label}</p>
                      <p className={`${item.color} font-semibold text-sm mt-0.5`}>{item.val}</p>
                    </div>
                  ))}
                </div>
                {/* Task list preview */}
                <div className="space-y-2.5">
                  {[
                    { task: 'Engine oil change', due: 'Today', urgent: true },
                    { task: 'Navigation lights check', due: 'In 3 days', urgent: false },
                    { task: 'Life raft inspection', due: 'In 2 weeks', urgent: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${item.urgent ? 'bg-rose-400' : 'bg-slate-600'}`} />
                        <span className="text-white/70 text-xs font-medium">{item.task}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.urgent ? 'bg-rose-500/15 text-rose-400' : 'bg-white/5 text-white/30'}`}>
                        {item.due}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Second floating card */}
              <div className="absolute -bottom-6 -left-10 bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] rounded-2xl p-4 w-52 shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Check size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-xs">Task completed</p>
                    <p className="text-white/30 text-[10px]">Just now</p>
                  </div>
                </div>
                <p className="text-white/40 text-[10px] leading-relaxed">Generator service logged and parts inventory updated automatically.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={() => scrollTo('#features')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-1.5 text-white/25 hover:text-white/60 transition-colors"
        >
          <span className="text-[10px] tracking-[0.25em] uppercase font-medium">{t.scroll}</span>
          <ChevronDown size={16} className="animate-bounce" />
        </button>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-cyan-400/80 text-xs tracking-[0.25em] uppercase font-bold mb-4">{t.features.badge}</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t.features.title}</h2>
            <p className="text-slate-400/60 max-w-xl mx-auto text-lg leading-relaxed">{t.features.sub}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {t.features.items.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div
                  key={i}
                  className="group relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-cyan-500/30 rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1 cursor-default"
                >
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_top_left,rgba(14,116,144,0.08),transparent_60%)]" />
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 flex items-center justify-center mb-5 transition-colors">
                      <Icon size={20} className="text-cyan-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-2 text-sm">{f.title}</h3>
                    <p className="text-slate-400/50 text-xs leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative z-10 py-32">
        <div className="max-w-6xl mx-auto px-6">
          {/* Section label line */}
          <div className="flex items-center gap-4 mb-16 justify-center">
            <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-cyan-500/30" />
            <p className="text-cyan-400/80 text-xs tracking-[0.25em] uppercase font-bold">{t.howItWorks.badge}</p>
            <div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-cyan-500/30" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-20">{t.howItWorks.title}</h2>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-14 left-[22%] right-[22%] h-px bg-gradient-to-r from-cyan-500/10 via-cyan-400/40 to-cyan-500/10" />

            {t.howItWorks.steps.map((step, i) => (
              <div key={i} className="relative text-center group">
                <div className="relative inline-flex items-center justify-center mb-8">
                  {/* Outer ring */}
                  <div className="w-28 h-28 rounded-full border border-cyan-500/20 absolute animate-pulse opacity-50" />
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0a2540] to-[#0d3356] border border-cyan-500/30 flex items-center justify-center shadow-xl shadow-black/30 group-hover:border-cyan-400/50 transition-all duration-300">
                    <span className="text-3xl font-bold bg-gradient-to-b from-cyan-300 to-sky-500 bg-clip-text text-transparent">{step.num}</span>
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg mb-3">{step.title}</h3>
                <p className="text-slate-400/50 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <section id="for-who" className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-cyan-400/80 text-xs tracking-[0.25em] uppercase font-bold mb-4">{t.forWho.badge}</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">{t.forWho.title}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.forWho.profiles.map((p, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.08] hover:border-cyan-500/30 transition-all duration-500 hover:-translate-y-1 cursor-default"
              >
                {/* Image */}
                <div className="h-60 overflow-hidden">
                  <img
                    src={PROFILE_IMGS[i]}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-75 group-hover:brightness-90"
                  />
                  <div className="absolute inset-0 h-60 bg-gradient-to-b from-black/10 via-black/30 to-[#05111e]" />
                </div>
                {/* Content */}
                <div className="relative bg-[#05111e] px-7 pb-7 -mt-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Anchor size={14} className="text-cyan-400" />
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight">{p.title}</h3>
                  </div>
                  <p className="text-slate-400/55 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-cyan-400/80 text-xs tracking-[0.25em] uppercase font-bold mb-4">{t.testimonials.badge}</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white">{t.testimonials.title}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.testimonials.items.map((item, i) => (
              <div
                key={i}
                className="group relative bg-white/[0.03] border border-white/[0.08] hover:border-cyan-500/25 rounded-2xl p-8 transition-all duration-300 hover:bg-white/[0.05]"
              >
                <div className="absolute top-6 right-6 text-6xl leading-none text-cyan-500/10 font-serif select-none">"</div>
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: item.stars }).map((_, j) => (
                    <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300/60 text-sm leading-relaxed mb-7 italic relative z-10">"{item.quote}"</p>
                <div className="flex items-center gap-3 border-t border-white/[0.06] pt-5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-sky-600/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-300 text-xs font-bold">{item.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{item.name}</div>
                    <div className="text-slate-500/70 text-xs mt-0.5">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="relative z-10 py-16 border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-slate-600 text-xs uppercase tracking-[0.25em] mb-10 font-medium">{t.trust.label}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {t.trust.items.map((item, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <div key={i} className="flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                    <Icon size={20} className="text-cyan-400/70" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{item.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{item.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative z-10 py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-500/15 bg-gradient-to-br from-[#091d32] to-[#05111e] p-12 md:p-16 text-center shadow-2xl">
            {/* Decorative glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-[radial-gradient(ellipse_at_top,rgba(14,116,144,0.2),transparent_70%)]" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-[radial-gradient(circle,rgba(2,132,199,0.08),transparent_70%)]" />
            <div className="relative">
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="h-px w-12 bg-cyan-500/30" />
                <Zap size={14} className="text-cyan-400" />
                <div className="h-px w-12 bg-cyan-500/30" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t.cta.title}</h2>
              <p className="text-slate-400/60 mb-10 text-lg max-w-2xl mx-auto leading-relaxed">{t.cta.sub}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => scrollTo('#contact')}
                  className="group flex items-center justify-center gap-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold px-10 py-4 rounded-full text-sm tracking-wide transition-all duration-300 shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/45 hover:-translate-y-0.5"
                >
                  {t.cta.btn}
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={onEnterApp}
                  className="border border-white/15 hover:border-white/30 text-white/60 hover:text-white px-10 py-4 rounded-full text-sm tracking-wide transition-all duration-300 hover:bg-white/[0.05] font-medium"
                >
                  {t.cta.btnSecondary}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ── */}
      <section id="contact" className="relative z-10 py-32">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-cyan-400/80 text-xs tracking-[0.25em] uppercase font-bold mb-4">{t.contact.badge}</p>
            <h2 className="text-4xl font-bold text-white mb-4">{t.contact.title}</h2>
            <p className="text-slate-400/55 leading-relaxed">{t.contact.sub}</p>
          </div>

          {submitted ? (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                <Check size={26} className="text-emerald-400" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">{t.contact.successTitle}</h3>
              <p className="text-slate-400/50 text-sm leading-relaxed max-w-xs mx-auto">{t.contact.successSub}</p>
              <button
                onClick={onEnterApp}
                className="mt-8 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold px-8 py-3 rounded-full text-sm transition-all shadow-lg shadow-cyan-500/25"
              >
                {t.contact.exploreBtn}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleContact}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 md:p-10 flex flex-col gap-5 shadow-2xl"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-2 font-semibold">{t.contact.name}</label>
                  <input
                    required
                    type="text"
                    value={contactForm.name}
                    onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.1] hover:border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all"
                    placeholder={t.contact.namePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-2 font-semibold">{t.contact.email}</label>
                  <input
                    required
                    type="email"
                    value={contactForm.email}
                    onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full bg-white/[0.05] border border-white/[0.1] hover:border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all"
                    placeholder={t.contact.emailPlaceholder}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-2 font-semibold">{t.contact.fleetType}</label>
                <select
                  value={contactForm.fleet}
                  onChange={e => setContactForm(f => ({ ...f, fleet: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.1] hover:border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all appearance-none"
                >
                  <option value="" className="bg-[#05111e] text-slate-400">{t.contact.fleetSelect}</option>
                  {t.contact.fleetOptions.map(o => (
                    <option key={o.value} value={o.value} className="bg-[#05111e]">{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-2 font-semibold">{t.contact.message}</label>
                <textarea
                  rows={4}
                  value={contactForm.message}
                  onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full bg-white/[0.05] border border-white/[0.1] hover:border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/40 transition-all resize-none"
                  placeholder={t.contact.messagePlaceholder}
                />
              </div>

              <button
                type="submit"
                className="group flex items-center justify-center gap-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold py-4 rounded-full text-sm tracking-wide transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 mt-2 hover:-translate-y-0.5"
              >
                {t.contact.send}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10">
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-600 flex items-center justify-center shadow shadow-cyan-500/25">
                  <Anchor size={14} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-lg font-bold text-white">
                  Yacht<span className="text-cyan-400">Ops</span>
                </span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">{t.footer.desc}</p>
              {/* Language toggle in footer */}
              <button
                onClick={() => setLang(l => l === 'en' ? 'es' : 'en')}
                className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-300 border border-white/[0.07] hover:border-white/15 px-3 py-1.5 rounded-full transition-all duration-200"
              >
                <Globe size={12} />
                {lang === 'en' ? 'Español' : 'English'}
              </button>
            </div>

            <div className="flex gap-16">
              <div>
                <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em] mb-5 font-semibold">{t.footer.platform}</p>
                <ul className="flex flex-col gap-3">
                  {t.footer.links.map(([label, href]) => (
                    <li key={href}>
                      <button
                        onClick={() => scrollTo(href)}
                        className="text-slate-600 hover:text-white text-sm transition-colors font-medium"
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em] mb-5 font-semibold">{t.footer.account}</p>
                <ul className="flex flex-col gap-3">
                  <li>
                    <button onClick={onEnterApp} className="text-slate-600 hover:text-white text-sm transition-colors font-medium">
                      {t.footer.signIn}
                    </button>
                  </li>
                  <li>
                    <button onClick={() => scrollTo('#contact')} className="text-slate-600 hover:text-white text-sm transition-colors font-medium">
                      {t.footer.requestDemo}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-slate-700 text-xs">
              &copy; {new Date().getFullYear()} YachtOps. {t.footer.rights}
            </p>
            <div className="flex items-center gap-1 text-slate-700 text-xs">
              <MapPin size={10} />
              <span>Monaco · Fort Lauderdale · Palma de Mallorca</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
