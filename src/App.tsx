import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Folder, Search, Menu, Settings, Info, PhoneCall, ShieldAlert, BookOpen,
  Sparkles, Plus, Trash2, Edit, Bookmark, Star, Volume2, VolumeX, ArrowLeft, ChevronRight, ChevronLeft,
  ArrowLeftRight, FileDown, X, Lock, Unlock, Settings2, Save, Moon, Sun, Cpu, Layers, Eye, Share2,
  CheckCircle, RefreshCw, Sliders, Download, Maximize, Minimize, Compass, ExternalLink, Play, Pause,
  Printer, PenTool, FileSpreadsheet, MoreVertical, Calendar, Crop, Grid, FileImage, Check, RotateCcw,
  Send, Bell, Globe, HelpCircle, Heart, BookMarked, FileCheck, LayoutGrid, Scissors, ShieldCheck, Type
} from 'lucide-react';

// @ts-ignore
import appLogo from './assets/images/pdf_master_new_logo_1782813848489.jpg';
import { ScannedDocumentPage } from './components/ScannedDocumentPage';
import { Droplet } from 'lucide-react';

// Navigation Item and Document Types
interface NavItem {
  id: string;
  title: string;
  route: string;
  enabled: boolean;
  order: number;
  icon: string;
}

interface AppConfig {
  admob: {
    publisherId: string;
    appId: string;
    appOpenId: string;
    bannerId: string;
    interstitialId: string;
    rewardedId: string;
    rewardedInterstitialId: string;
    nativeId: string;
  };
  navigation: NavItem[];
  pages: {
    about: string;
    contact: string;
    privacy: string;
    terms: string;
    [key: string]: string;
  };
}

interface PDFDocument {
  id: string;
  name: string;
  size: string;
  pages: { pageNumber: number; content: string; imageBase64?: string }[];
  bookmarkCount: number;
  isBookmarked: boolean;
  lastViewed: string;
  created: string;
  isImage?: boolean;
  isLocked?: boolean;
  isWord?: boolean;
  isPPT?: boolean;
}

export default function App() {
  // Screens & Navigation
  const [currentScreen, setCurrentScreen] = useState<string>('splash');
  const [activeTab, setActiveTab] = useState<'all_files' | 'recent' | 'bookmarks' | 'tools'>('all_files');
  const [activeCategory, setActiveCategory] = useState<'All' | 'PDF' | 'Word' | 'Excel' | 'PPT'>('All');
  
  // Theme state
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme_mode');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    localStorage.setItem('theme_mode', nextTheme);
    triggerNotification(`Applied ${nextTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} theme mode!`);
  };

  const handleDownloadLogo = (cropped: boolean) => {
    if (!cropped) {
      // Just download original
      const a = document.createElement('a');
      a.href = appLogo;
      a.download = 'pdf_master_logo_original.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerNotification('📥 Downloading original logo asset!');
      return;
    }

    // Create canvas and crop
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = appLogo;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);

        // Crop the top 1.28 section of the original image
        const sWidth = img.naturalWidth / 1.28;
        const sHeight = img.naturalHeight / 1.28;
        const sX = (img.naturalWidth - sWidth) / 2;
        const sY = 0; // Aligned to top, so no text is captured!

        ctx.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, 512, 512);

        // Create a link and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pdf_master_logo_textless_512x512.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            triggerNotification('✨ Textless cropped app icon downloaded successfully!');
          }
        }, 'image/png');
      }
    };
    img.onerror = () => {
      // Fallback if canvas fails
      const a = document.createElement('a');
      a.href = appLogo;
      a.download = 'pdf_master_logo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      triggerNotification('📥 Downloading original logo asset as fallback.');
    };
  };

  const [showDrawer, setShowDrawer] = useState(false);
  const [activePage, setActivePage] = useState<string>('home');

  // Data State
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState<'date_newest' | 'date_oldest' | 'name_az' | 'name_za' | 'size_largest' | 'size_smallest'>('date_newest');
  
  // UI Dialog Modals
  const [selectedDoc, setSelectedDoc] = useState<PDFDocument | null>(null);
  const [dropdownDoc, setDropdownDoc] = useState<PDFDocument | null>(null);
  const [lockedDocToOpen, setLockedDocToOpen] = useState<PDFDocument | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Tool Interactivity States
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrDocName, setOcrDocName] = useState('My_OCR_Scanned_Doc');
  const [ocrLanguage, setOcrLanguage] = useState('English');
  const [ocrResult, setOcrResult] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  
  // Text to PDF converter states
  const [convTitle, setConvTitle] = useState('New_Compiled_Document');
  const [convText, setConvText] = useState('');
  const [convLoading, setConvLoading] = useState(false);

  // PDF tools states
  const [selectedMergeDocs, setSelectedMergeDocs] = useState<string[]>([]);
  const [mergeTitle, setMergeTitle] = useState('Merged_Document');
  const [compressingDoc, setCompressingDoc] = useState<PDFDocument | null>(null);
  const [signingDoc, setSigningDoc] = useState<PDFDocument | null>(null);
  const [signingName, setSigningName] = useState('');
  const [editorDoc, setEditorDoc] = useState<PDFDocument | null>(null);
  const [editorText, setEditorText] = useState('');
  const [lockSetupDoc, setLockSetupDoc] = useState<PDFDocument | null>(null);
  const [lockSetupPin, setLockSetupPin] = useState('');

  // Image to PDF states
  const [imageToPdfName, setImageToPdfName] = useState('My_Photo_Converted');
  const [imageToPdfSelected, setImageToPdfSelected] = useState<string | null>(null);
  const [imageToPdfFiles, setImageToPdfFiles] = useState<{name: string, base64: string}[]>([]);
  const [imageToPdfLoading, setImageToPdfLoading] = useState(false);

  // ID Card merger states
  const [idCardFrontScanned, setIdCardFrontScanned] = useState(false);
  const [idCardBackScanned, setIdCardBackScanned] = useState(false);
  const [idCardName, setIdCardName] = useState('My_National_ID_Card');
  const [idCardLoading, setIdCardLoading] = useState(false);
  
  // High-fidelity Settings states
  const [keepScreenOn, setKeepScreenOn] = useState<boolean>(() => localStorage.getItem('keep_screen_on') === 'true');
  const [securityQuestion, setSecurityQuestion] = useState<boolean>(() => localStorage.getItem('security_question') === 'true');
  const [notifications, setNotifications] = useState<boolean>(() => localStorage.getItem('notifications') !== 'false');
  const [themeSetting, setThemeSetting] = useState<string>(() => localStorage.getItem('theme_setting') || 'System default');
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('language_setting') || 'English');
  const [defaultReader, setDefaultReader] = useState<string>(() => localStorage.getItem('default_reader_setting') || 'Built-in PDF Viewer');
  
  // Settings Interactive Modals States
  const [showFileManagerModal, setShowFileManagerModal] = useState(false);
  const [showScanSettingsModal, setShowScanSettingsModal] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showSecurityQuestionSetupModal, setShowSecurityQuestionSetupModal] = useState(false);
  const [securityQuestionText, setSecurityQuestionText] = useState(() => localStorage.getItem('security_question_text') || "What was your first school's name?");
  const [securityAnswerText, setSecurityAnswerText] = useState(() => localStorage.getItem('security_answer_text') || "");
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  
  // Temporary dropdown overlay states for settings dropdowns
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showReaderDropdown, setShowReaderDropdown] = useState(false);
  
  // Camera scan states
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState<'preview' | 'captured'>('preview');

  // Reader Settings
  const [readerPage, setReaderPage] = useState(1);
  const [readerZoom, setReaderZoom] = useState(100);
  const [readerSearch, setReaderSearch] = useState('');
  const [readerTTSActive, setReaderTTSActive] = useState(false);
  const [readerNotes, setReaderNotes] = useState<{ [docPageId: string]: string }>({});
  const [noteInput, setNoteInput] = useState('');
  const [showSearchToolbar, setShowSearchToolbar] = useState(false);
  const [readerPaperTint, setReaderPaperTint] = useState<'white' | 'sepia' | 'dark'>('white');
  const [readerTheme, setReaderTheme] = useState<'white' | 'mint' | 'tan' | 'slate' | 'black'>('white');
  const [readerScrollDirection, setReaderScrollDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const [readerBrightness, setReaderBrightness] = useState<number>(100);
  const [readerBrightnessAuto, setReaderBrightnessAuto] = useState<boolean>(false);
  const [readerContinuous, setReaderContinuous] = useState<boolean>(true);
  const [readerNightMode, setReaderNightMode] = useState<boolean>(false);
  const [showReaderSettingsSheet, setShowReaderSettingsSheet] = useState<boolean>(false);
  const [showReaderMenuSheet, setShowReaderMenuSheet] = useState<boolean>(false);
  const [showGoToPageDialog, setShowGoToPageDialog] = useState<boolean>(false);
  const [goToPageInput, setGoToPageInput] = useState<string>('');
  const [showCompressDialog, setShowCompressDialog] = useState<boolean>(false);
  const [compressQuality, setCompressQuality] = useState<'small' | 'medium' | 'large'>('medium');
  const [compressTargetDoc, setCompressTargetDoc] = useState<PDFDocument | null>(null);

  // General States
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [bannerClosed, setBannerClosed] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Admin Config Inputs
  const [adminToken, setAdminToken] = useState('Admin@Omith*666');
  const [adminNavs, setAdminNavs] = useState<NavItem[]>([]);
  const [adminPageAbout, setAdminPageAbout] = useState('');
  const [adminPageContact, setAdminPageContact] = useState('');
  const [adminPagePrivacy, setAdminPagePrivacy] = useState('');
  const [adminPageTerms, setAdminPageTerms] = useState('');
  const [adminPages, setAdminPages] = useState<{ [key: string]: string }>({});
  const [adminActiveTab, setAdminActiveTab] = useState<'admob' | 'navigation' | 'pages'>('admob');

  // States for adding dynamic menu item
  const [newNavTitle, setNewNavTitle] = useState('');
  const [newNavRoute, setNewNavRoute] = useState('');
  const [newNavIcon, setNewNavIcon] = useState('FileText');
  const [newNavEnabled, setNewNavEnabled] = useState(true);
  const [selectedAdminPageKey, setSelectedAdminPageKey] = useState<string>('about');

  // Admin Navigation Helper Functions
  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const updated = [...adminNavs].sort((a, b) => a.order - b.order);
    if (direction === 'up' && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'down' && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    
    const reordered = updated.map((nav, idx) => ({
      ...nav,
      order: idx + 1
    }));
    
    setAdminNavs(reordered);
    triggerNotification('🔄 Menu reordered. Remember to click Save Publish!');
  };

  const handleAddNavItem = () => {
    if (!newNavTitle.trim() || !newNavRoute.trim()) {
      triggerNotification('❌ Please fill in Title and Route!');
      return;
    }
    
    let formattedRoute = newNavRoute.trim();
    if (!formattedRoute.startsWith('/')) {
      formattedRoute = '/' + formattedRoute;
    }
    
    const pageKey = formattedRoute.replace('/', '');
    
    const newItem: NavItem = {
      id: `nav-${Date.now()}`,
      title: newNavTitle.trim(),
      route: formattedRoute,
      enabled: newNavEnabled,
      order: adminNavs.length + 1,
      icon: newNavIcon
    };
    
    setAdminNavs(prev => [...prev, newItem]);
    
    setAdminPages(prev => ({
      ...prev,
      [pageKey]: prev[pageKey] || `# ${newNavTitle.trim()}\n\nWelcome to your new page! Use the Page Content tab to modify this text.`
    }));
    
    setNewNavTitle('');
    setNewNavRoute('');
    setNewNavIcon('FileText');
    setNewNavEnabled(true);
    triggerNotification('➕ Navigation item added! Click Save Publish.');
  };

  const handleDeleteNavItem = (id: string, route: string) => {
    const updated = adminNavs.filter(nav => nav.id !== id).map((nav, idx) => ({
      ...nav,
      order: idx + 1
    }));
    setAdminNavs(updated);
    
    const pageKey = route.replace('/', '');
    const updatedPages = { ...adminPages };
    delete updatedPages[pageKey];
    setAdminPages(updatedPages);
    
    triggerNotification('🗑️ Navigation item deleted.');
  };

  const handleUpdateNavItem = (id: string, fields: Partial<NavItem>) => {
    setAdminNavs(prev => prev.map(nav => {
      if (nav.id === id) {
        const updatedNav = { ...nav, ...fields };
        if (fields.route && fields.route !== nav.route) {
          const oldKey = nav.route.replace('/', '');
          const newKey = fields.route.replace('/', '');
          setAdminPages(prevPages => {
            const updatedPages = { ...prevPages };
            if (updatedPages[oldKey] !== undefined) {
              updatedPages[newKey] = updatedPages[oldKey];
              delete updatedPages[oldKey];
            }
            return updatedPages;
          });
        }
        return updatedNav;
      }
      return nav;
    }));
  };

  // Speech helper ref
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Status Notification helper
  const triggerNotification = (message: string) => {
    setStatusNotification(message);
    setTimeout(() => {
      setStatusNotification(null);
    }, 3500);
  };

  // Fetch data on mount
  const fetchSystemData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const configRes = await fetch('/api/config');
      const configData = await configRes.json();
      setConfig(configData);
      setAdminNavs(configData.navigation || []);
      setAdminPageAbout(configData.pages.about);
      setAdminPageContact(configData.pages.contact);
      setAdminPagePrivacy(configData.pages.privacy);
      setAdminPageTerms(configData.pages.terms);
      setAdminPages(configData.pages || {});

      const docsRes = await fetch('/api/documents');
      const docsData = await docsRes.json();
      setDocuments(docsData);
    } catch (err) {
      console.error('Error loading documents:', err);
      triggerNotification('⚠️ Connection error. Mode: Offline Storage.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  // Splash Screen Loader
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('app');
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // Custom function to navigate to a page and scroll it smoothly into view
  const navigateToPage = (pageNum: number) => {
    setReaderPage(pageNum);
    
    // Smoothly scroll the target page card into view if in continuous mode
    if (readerContinuous) {
      setTimeout(() => {
        const card = document.getElementById(`reader-page-card-${pageNum}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 80);
    }
  };

  // Scroll Listener for Continuous Scroll Mode to auto-update active readerPage indicator
  useEffect(() => {
    const container = document.getElementById('reader-continuous-scroll-container');
    if (!container || !readerContinuous || currentScreen !== 'reader' || !selectedDoc) return;

    const handleScroll = () => {
      const children = container.children;
      let closestPage = 1;
      let minDistance = Infinity;

      const containerRect = container.getBoundingClientRect();
      const containerCenter = readerScrollDirection === 'horizontal'
        ? containerRect.left + containerRect.width / 2
        : containerRect.top + containerRect.height / 2;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childRect = child.getBoundingClientRect();
        const childCenter = readerScrollDirection === 'horizontal'
          ? childRect.left + childRect.width / 2
          : childRect.top + childRect.height / 2;

        const distance = Math.abs(childCenter - containerCenter);
        if (distance < minDistance) {
          minDistance = distance;
          // ID format: reader-page-card-{pageNum}
          const idParts = child.id.split('-');
          const pageNum = parseInt(idParts[idParts.length - 1]);
          if (!isNaN(pageNum)) {
            closestPage = pageNum;
          }
        }
      }

      setReaderPage(closestPage);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on load to align initial page
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [readerContinuous, currentScreen, selectedDoc, readerScrollDirection, readerZoom]);

  // Handle document clicks (including pin check)
  const handleDocClick = (doc: PDFDocument) => {
    if (doc.isLocked) {
      setLockedDocToOpen(doc);
      setPinInput('');
      setPinError(false);
    } else {
      openReader(doc);
    }
  };

  // Open PDF Reader Screen
  const openReader = (doc: PDFDocument) => {
    setSelectedDoc(doc);
    setReaderPage(1);
    setReaderZoom(100);
    setReaderSearch('');
    const firstPageNote = readerNotes[`${doc.id}-1`] || '';
    setNoteInput(firstPageNote);
    setCurrentScreen('reader');
    
    // Register lastViewed in DB
    fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: { ...doc, lastViewed: new Date().toISOString() } })
    }).then(res => res.json()).then(data => {
      if (data.documents) setDocuments(data.documents);
    });
  };

  // Pin Unlock handler
  const handleUnlockSubmit = () => {
    if (pinInput === '1234' || pinInput === '0000' || pinInput === '2026') {
      const target = lockedDocToOpen;
      setLockedDocToOpen(null);
      if (target) openReader(target);
    } else {
      setPinError(true);
      triggerNotification('❌ Invalid PIN Code. Try 1234 or 2026!');
    }
  };

  // Text-To-Speech Playback
  const startTTS = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setReaderTTSActive(false);
    utterance.onerror = () => setReaderTTSActive(false);
    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setReaderTTSActive(true);
    triggerNotification('🔊 Voice document reader activated...');
  };

  const stopTTS = () => {
    window.speechSynthesis.cancel();
    setReaderTTSActive(false);
    triggerNotification('🔇 Voice reader paused.');
  };

  // Delete Document
  const deleteDocument = async (id: string) => {
    if (!window.confirm('Delete this file permanently?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      setDocuments(data.documents);
      triggerNotification('🗑️ Document deleted successfully.');
    } catch (err) {
      triggerNotification('❌ Delete action failed.');
    }
  };

  // Toggle Star Bookmark
  const toggleBookmark = async (doc: PDFDocument) => {
    const updated = { ...doc, isBookmarked: !doc.isBookmarked };
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: updated })
      });
      const data = await res.json();
      setDocuments(data.documents);
      if (selectedDoc && selectedDoc.id === doc.id) {
        setSelectedDoc(updated);
      }
      triggerNotification(updated.isBookmarked ? '⭐ Added to Bookmarks.' : 'Removed from Bookmarks.');
    } catch (err) {
      triggerNotification('❌ Bookmark sync error.');
    }
  };

  // Process OCR (Gemini API)
  const processOCR = async () => {
    if (!ocrImage) {
      triggerNotification('📷 Please upload or choose a document first.');
      return;
    }
    setOcrLoading(true);
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: ocrImage, language: ocrLanguage, documentName: ocrDocName })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setOcrResult(data.text);
      triggerNotification('⚡ Gemini OCR extraction finished!');
    } catch (err: any) {
      triggerNotification(`❌ OCR Failed: ${err.message || 'Server error'}`);
    } finally {
      setOcrLoading(false);
    }
  };

  // Create PDF from text
  const compileTextToPDF = async () => {
    if (!convTitle.trim() || !convText.trim()) {
      triggerNotification('📝 Please add a filename and contents.');
      return;
    }
    setConvLoading(true);
    try {
      const res = await fetch('/api/tools/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: convTitle, sourceText: convText, fileType: 'PDF' })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDocuments(data.documents);
      triggerNotification(`🎉 PDF "${convTitle}" compiled successfully!`);
      setActiveTool(null);
      setConvText('');
      setActiveTab('all_files');
    } catch (err: any) {
      triggerNotification(`❌ Conversion failed: ${err.message}`);
    } finally {
      setConvLoading(false);
    }
  };

  // Merge selected files
  const mergeSelectedFiles = async () => {
    if (selectedMergeDocs.length < 2) {
      triggerNotification('🔗 Please select 2 or more files to merge.');
      return;
    }
    setConvLoading(true);
    try {
      const docsToMerge = documents.filter(d => selectedMergeDocs.includes(d.id));
      const mergedPages: { pageNumber: number; content: string }[] = [];
      let currentPg = 1;
      
      docsToMerge.forEach(doc => {
        doc.pages.forEach(p => {
          mergedPages.push({
            pageNumber: currentPg++,
            content: `[Merged from ${doc.name}]\n${p.content}`
          });
        });
      });

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            name: mergeTitle.endsWith('.pdf') ? mergeTitle : `${mergeTitle}.pdf`,
            size: '1.5 MB',
            pages: mergedPages,
            bookmarkCount: 0,
            isBookmarked: false
          }
        })
      });
      const data = await res.json();
      setDocuments(data.documents);
      setSelectedMergeDocs([]);
      triggerNotification('🎉 Files merged successfully!');
      setActiveTool(null);
      setActiveTab('all_files');
    } catch (err) {
      triggerNotification('❌ Merge process failed.');
    } finally {
      setConvLoading(false);
    }
  };

  // Compress PDF Action
  const runCompressPDF = async (doc: PDFDocument, quality: 'small' | 'medium' | 'large' = 'medium') => {
    setCompressingDoc(doc);
    setTimeout(async () => {
      let ratio = 0.6;
      if (quality === 'small') ratio = 0.35;
      else if (quality === 'medium') ratio = 0.6;
      else if (quality === 'large') ratio = 0.85;

      const updated = {
        ...doc,
        size: doc.size.includes('KB') 
          ? `${Math.max(10, Math.round(parseFloat(doc.size) * ratio))} KB`
          : `${Math.max(0.2, parseFloat((parseFloat(doc.size) * ratio).toFixed(1)))} MB`
      };
      
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: updated })
      });
      const data = await res.json();
      setDocuments(data.documents);
      if (selectedDoc && selectedDoc.id === doc.id) {
        setSelectedDoc(updated);
      }
      setCompressingDoc(null);
      triggerNotification(`📉 Compressed "${doc.name}" down to ${updated.size}!`);
    }, 1800);
  };

  // Sign Document Action
  const runSignDocument = async () => {
    if (!signingDoc || !signingName.trim()) return;
    const updated = {
      ...signingDoc,
      pages: signingDoc.pages.map(p => ({
        ...p,
        content: `${p.content}\n\n[🔒 SIGNED BY: ${signingName} (Date: ${new Date().toLocaleDateString()})]`
      }))
    };
    
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: updated })
    });
    const data = await res.json();
    setDocuments(data.documents);
    setSigningDoc(null);
    setSigningName('');
    triggerNotification(`🖋️ Document signed with signature: "${signingName}"!`);
  };

  // Edit Text Document Action
  const runEditTextDocument = async () => {
    if (!editorDoc) return;
    const updated = {
      ...editorDoc,
      pages: editorDoc.pages.map((p, idx) => idx === 0 ? { ...p, content: editorText } : p)
    };

    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: updated })
    });
    const data = await res.json();
    setDocuments(data.documents);
    setEditorDoc(null);
    setEditorText('');
    triggerNotification(`✍️ Text updated and saved on server!`);
  };

  // Lock document setup
  const runLockDocument = async () => {
    if (!lockSetupDoc || !lockSetupPin) return;
    const updated = { ...lockSetupDoc, isLocked: true };
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: updated })
    });
    const data = await res.json();
    setDocuments(data.documents);
    setLockSetupDoc(null);
    setLockSetupPin('');
    triggerNotification(`🔒 Document "${lockSetupDoc.name}" locked with password!`);
  };

  // Unlock document permanently
  const runUnlockDocumentPermanently = async (doc: PDFDocument) => {
    const updated = { ...doc, isLocked: false };
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: updated })
    });
    const data = await res.json();
    setDocuments(data.documents);
    triggerNotification(`🔓 Password lock removed from "${doc.name}"!`);
  };

  // Camera Scan Image Simulation
  const triggerCameraCapture = () => {
    setScanStage('captured');
    triggerNotification('📸 Page captured and cropped. Processing layout...');
    setTimeout(() => {
      // Mock base64 scanner image
      setOcrImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAGQCAYAAABv5C==');
      setOcrDocName('Camera_Scan_Doc_' + Date.now().toString().slice(-4));
      setIsScanning(false);
      setScanStage('preview');
      setActiveTool('image_to_text');
      triggerNotification('📄 Scanned picture loaded into AI OCR engine!');
    }, 1500);
  };

  // Preloaded OCR Samples
  const loadOcrSample = (type: 'receipt' | 'report') => {
    if (type === 'receipt') {
      setOcrImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASw==');
      setOcrDocName('Coffee_Shop_Receipt');
      triggerNotification('Loaded Coffee Shop bill scan.');
    } else {
      setOcrImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABBA==');
      setOcrDocName('Q2_Executive_Executive_Report');
      triggerNotification('Loaded Executive summary page scan.');
    }
  };

  // Run conversion for Image to PDF tool
  const runImageToPdfConvert = async () => {
    if (!imageToPdfSelected) {
      triggerNotification('📷 Please select or upload an image first.');
      return;
    }
    setImageToPdfLoading(true);
    try {
      const docName = imageToPdfName.trim().endsWith('.pdf') ? imageToPdfName.trim() : `${imageToPdfName.trim()}.pdf`;
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            name: docName,
            size: '512 KB',
            pages: imageToPdfFiles.length > 0 ? imageToPdfFiles.map((file, idx) => ({
              pageNumber: idx + 1,
              content: `== IMAGE CONVERTED TO PDF ===\nSource Image File: ${file.name}\nGenerated Date: ${new Date().toLocaleDateString()}\n\n[Raster Image Data Compiled successfully inside standard PDF page container. Coordinates, colors, and EXIF attributes preserved.]`,
              imageBase64: file.base64
            })) : [
              {
                pageNumber: 1,
                content: `== IMAGE CONVERTED TO PDF ===\nSource Image File: ${imageToPdfSelected}\nGenerated Date: ${new Date().toLocaleDateString()}\n\n[Raster Image Data Compiled successfully inside standard PDF page container. Coordinates, colors, and EXIF attributes preserved.]`
              }
            ],
            bookmarkCount: 0,
            isBookmarked: false
          }
        })
      });
      const data = await res.json();
      setDocuments(data.documents);
      triggerNotification(`🎉 Image successfully converted to PDF: "${docName}"!`);
      setImageToPdfSelected(null);
      setImageToPdfFiles([]);
      setImageToPdfName('My_Photo_Converted');
      setActiveTool(null);
      setActiveTab('all_files');
    } catch (err) {
      triggerNotification('❌ Image conversion failed.');
    } finally {
      setImageToPdfLoading(false);
    }
  };

  // Run dynamic compilation for Front & Back ID Card Merge
  const runIdCardMerge = async () => {
    if (!idCardFrontScanned || !idCardBackScanned) {
      triggerNotification('🪪 Please scan or capture both front and back sides.');
      return;
    }
    setIdCardLoading(true);
    try {
      const docName = idCardName.trim().endsWith('.pdf') ? idCardName.trim() : `${idCardName.trim()}.pdf`;
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            name: docName,
            size: '320 KB',
            pages: [
              {
                pageNumber: 1,
                content: `== MERGED DUAL-SIDE ID CARD SCAN ===\nDocument ID Name: ${idCardName}\n\n=========================================\n[ FRONT SIDE - NATIONAL IDENTITY CARD ]\nHolder Photo & Hologram Verified.\nSerial: NIC-88294-A2\n=========================================\n\n=========================================\n[ BACK SIDE - CODES & CHIP DETAILS ]\nMagnetic Strip Hash Code: 494EF29CA\nIssuer: Government Authority Dept\n=========================================\n\n[🛡️ SECURITY WATERMARK: PDF MASTER PRO ORIGINAL SECURE ID SCAN]`
              }
            ],
            bookmarkCount: 0,
            isBookmarked: false
          }
        })
      });
      const data = await res.json();
      setDocuments(data.documents);
      triggerNotification(`🎉 ID Card Front & Back successfully compiled to PDF: "${docName}"!`);
      setIdCardFrontScanned(false);
      setIdCardBackScanned(false);
      setActiveTool(null);
      setActiveTab('all_files');
    } catch (err) {
      triggerNotification('❌ ID Card compilation failed.');
    } finally {
      setIdCardLoading(false);
    }
  };

  // Word to PDF converter
  const runWordToPdf = async (doc: PDFDocument) => {
    const baseName = doc.name.replace(/\.[^/.]+$/, "");
    const pdfName = `${baseName}_converted.pdf`;
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            name: pdfName,
            size: '150 KB',
            pages: doc.pages.map((p, idx) => ({
              pageNumber: idx + 1,
              content: `== CONVERTED FROM WORD (.docx) ===\n${p.content}`
            })),
            bookmarkCount: 0,
            isBookmarked: false
          }
        })
      });
      const data = await res.json();
      setDocuments(data.documents);
      triggerNotification(`🎉 "${doc.name}" converted to standard PDF: "${pdfName}"!`);
      setActiveTool(null);
      setActiveTab('all_files');
    } catch (err) {
      triggerNotification('❌ Word to PDF conversion failed.');
    }
  };

  // PDF to Word converter
  const runPdfToWord = async (doc: PDFDocument) => {
    const baseName = doc.name.replace(/\.[^/.]+$/, "");
    const docxName = `${baseName}_reflow.docx`;
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            name: docxName,
            size: '1.1 MB',
            isWord: true,
            pages: doc.pages.map((p, idx) => ({
              pageNumber: idx + 1,
              content: `== Microsoft Word Document (.docx) ===\n[Reflowed Layout from PDF Source]\n\n${p.content}`
            })),
            bookmarkCount: 0,
            isBookmarked: false
          }
        })
      });
      const data = await res.json();
      setDocuments(data.documents);
      triggerNotification(`🎉 "${doc.name}" successfully reflowed to Word document: "${docxName}"!`);
      setActiveTool(null);
      setActiveTab('all_files');
    } catch (err) {
      triggerNotification('❌ PDF to Word conversion failed.');
    }
  };

  // PDF to Image
  const runPdfToImage = async (doc: PDFDocument) => {
    const baseName = doc.name.replace(/\.[^/.]+$/, "");
    const imgName = `${baseName}_Page_1.png`;
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            name: imgName,
            size: '250 KB',
            pages: [
              {
                pageNumber: 1,
                content: `== PNG IMAGE RASTER (Page 1) ===\nSource PDF: ${doc.name}\n\n[All text and layouts successfully rasterized into lossless pixel grid at 300 DPI resolution.]`
              }
            ],
            bookmarkCount: 0,
            isBookmarked: false
          }
        })
      });
      const data = await res.json();
      setDocuments(data.documents);
      triggerNotification(`🎉 Exported Page 1 of "${doc.name}" as Image: "${imgName}"!`);
      setActiveTool(null);
      setActiveTab('all_files');
    } catch (err) {
      triggerNotification('❌ PDF to Image conversion failed.');
    }
  };

  // PDF to Long Image
  const runPdfToLongImage = async (doc: PDFDocument) => {
    const baseName = doc.name.replace(/\.[^/.]+$/, "");
    const imgName = `${baseName}_Stitched_LongImage.jpg`;
    
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            name: imgName,
            size: '1.4 MB',
            pages: [
              {
                pageNumber: 1,
                content: `== STITCHED LONG VERTICAL IMAGE ===\nSource PDF: ${doc.name}\n\n[Merged ${doc.pages.length} pages vertically into a seamless single JPEG image map for web presentation and offline backup.]`
              }
            ],
            bookmarkCount: 0,
            isBookmarked: false
          }
        })
      });
      const data = await res.json();
      setDocuments(data.documents);
      triggerNotification(`🎉 Stitched all pages of "${doc.name}" into single Long Image: "${imgName}"!`);
      setActiveTool(null);
      setActiveTab('all_files');
    } catch (err) {
      triggerNotification('❌ Long Image conversion failed.');
    }
  };

  // Split PDF
  const runSplitPdf = async (doc: PDFDocument) => {
    if (doc.pages.length < 2) {
      triggerNotification(`ℹ️ Document "${doc.name}" is already a single page document.`);
      return;
    }
    const baseName = doc.name.replace(/\.[^/.]+$/, "");
    
    try {
      // Create new files for each page
      for (let i = 0; i < doc.pages.length; i++) {
        const pageNum = i + 1;
        const childName = `${baseName}_Page_${pageNum}.pdf`;
        await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: {
              name: childName,
              size: '120 KB',
              pages: [
                {
                  pageNumber: 1,
                  content: `== SPLIT PAGE ${pageNum} OF ${doc.pages.length} ===\nSource File: ${doc.name}\n\n${doc.pages[i].content}`
                }
              ],
              bookmarkCount: 0,
              isBookmarked: false
            }
          })
        });
      }
      
      // Fetch refreshed documents list
      const getRes = await fetch('/api/documents');
      const documentsData = await getRes.json();
      setDocuments(documentsData);
      
      triggerNotification(`🎉 Successfully split "${doc.name}" into ${doc.pages.length} single-page PDF files!`);
      setActiveTool(null);
      setActiveTab('all_files');
    } catch (err) {
      triggerNotification('❌ Split PDF process failed.');
    }
  };

  // Search input typing logic
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value === 'Admin@Omith*666') {
      setSearchQuery('');
      setShowAdminPanel(true);
      triggerNotification('🔑 Secured administrator overrides unlocked!');
    }
  };

  // Save admin edits
  const saveAdminSettings = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admob: config?.admob,
          navigation: adminNavs,
          pages: adminPages,
          token: adminToken
        })
      });
      const data = await res.json();
      if (res.status === 200) {
        setConfig(data.config);
        setShowAdminPanel(false);
        triggerNotification('💾 Configuration published on server database!');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      triggerNotification(`❌ Save Failed: ${err.message || 'Unauthorized'}`);
    }
  };

  // Document sorting
  const getSortedDocs = (docList: PDFDocument[]) => {
    let list = [...docList];
    
    // Filter by Tab
    if (activeTab === 'recent') {
      list = list.sort((a, b) => new Date(b.lastViewed).getTime() - new Date(a.lastViewed).getTime());
    } else if (activeTab === 'bookmarks') {
      list = list.filter(d => d.isBookmarked);
    }

    // Filter by Category selector ("All", "PDF", "Word", "Excel", "PPT")
    if (activeCategory === 'PDF') {
      list = list.filter(d => d.name.toLowerCase().endsWith('.pdf'));
    } else if (activeCategory === 'Word') {
      list = list.filter(d => d.isWord || d.name.toLowerCase().endsWith('.docx') || d.name.toLowerCase().endsWith('.doc'));
    } else if (activeCategory === 'Excel') {
      list = list.filter(d => d.name.toLowerCase().endsWith('.csv') || d.name.toLowerCase().endsWith('.xlsx') || d.name.toLowerCase().endsWith('.xls'));
    } else if (activeCategory === 'PPT') {
      list = list.filter(d => d.isPPT || d.name.toLowerCase().endsWith('.pptx') || d.name.toLowerCase().endsWith('.ppt'));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      list = list.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Apply Sorting
    if (sortBy === 'date_newest') {
      list = list.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    } else if (sortBy === 'date_oldest') {
      list = list.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
    } else if (sortBy === 'name_az') {
      list = list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name_za') {
      list = list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'size_largest' || sortBy === 'size_smallest') {
      const parseSize = (sizeStr: string) => {
        const val = parseFloat(sizeStr);
        if (sizeStr.includes('MB')) return val * 1024 * 1024;
        if (sizeStr.includes('KB')) return val * 1024;
        return val;
      };
      if (sortBy === 'size_largest') {
        list = list.sort((a, b) => parseSize(b.size) - parseSize(a.size));
      } else {
        list = list.sort((a, b) => parseSize(a.size) - parseSize(b.size));
      }
    }

    return list;
  };

  // Helper relative date string formatter
  const getRelativeDateString = (createdIsoString: string) => {
    try {
      const createdDate = new Date(createdIsoString);
      const now = new Date();
      
      // Strip hours to compare calendar days
      const createdZero = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
      const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const diffMs = nowZero.getTime() - createdZero.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
      
      // Format as "MMM DD, YYYY"
      return createdDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Recent';
    }
  };

  // High fidelity vector icon components
  const WordIcon = () => (
    <svg viewBox="0 0 48 48" className="w-11 h-11 text-[#1b5cb1]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="44" height="44" rx="10" fill="#e6f0fa" />
      <path d="M14 13H34V35H14V13Z" fill="white" stroke="#1b5cb1" strokeWidth="2" strokeLinejoin="round" />
      <rect x="14" y="13" width="9" height="22" fill="#1b5cb1" />
      <text x="15" y="27" fill="white" fontSize="11" fontWeight="900" fontFamily="sans-serif">W</text>
      <line x1="26" y1="18" x2="31" y2="18" stroke="#1b5cb1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="23" x2="31" y2="23" stroke="#1b5cb1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="28" x2="31" y2="28" stroke="#1b5cb1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  const ExcelIcon = () => (
    <svg viewBox="0 0 48 48" className="w-11 h-11 text-[#107c41]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="44" height="44" rx="10" fill="#eaf4ec" />
      <path d="M14 13H34V35H14V13Z" fill="white" stroke="#107c41" strokeWidth="2" strokeLinejoin="round" />
      <rect x="14" y="13" width="9" height="22" fill="#107c41" />
      <text x="16" y="27" fill="white" fontSize="11" fontWeight="900" fontFamily="sans-serif">X</text>
      <line x1="26" y1="13" x2="26" y2="35" stroke="#107c41" strokeWidth="1" />
      <line x1="30" y1="13" x2="30" y2="35" stroke="#107c41" strokeWidth="1" />
      <line x1="23" y1="19" x2="34" y2="19" stroke="#107c41" strokeWidth="1" />
      <line x1="23" y1="25" x2="34" y2="25" stroke="#107c41" strokeWidth="1" />
      <line x1="23" y1="31" x2="34" y2="31" stroke="#107c41" strokeWidth="1" />
    </svg>
  );

  const PptIcon = () => (
    <svg viewBox="0 0 48 48" className="w-11 h-11 text-[#d83b01]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="44" height="44" rx="10" fill="#fbeee6" />
      <path d="M14 13H34V35H14V13Z" fill="white" stroke="#d83b01" strokeWidth="2" strokeLinejoin="round" />
      <rect x="14" y="13" width="9" height="22" fill="#d83b01" />
      <text x="16" y="27" fill="white" fontSize="11" fontWeight="900" fontFamily="sans-serif">P</text>
      <circle cx="28" cy="24" r="4.5" stroke="#d83b01" strokeWidth="1.5" />
      <path d="M28 24L31 21" stroke="#d83b01" strokeWidth="1.5" />
      <path d="M28 24V19.5" stroke="#d83b01" strokeWidth="1.5" />
    </svg>
  );

  const PdfIcon = () => (
    <svg viewBox="0 0 48 48" className="w-11 h-11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4 H30 L38 12 V44 H12 Z" fill="#e52d27" />
      <path d="M30 4 V12 H38 Z" fill="#ffa5a5" />
      <text 
        x="25" 
        y="30" 
        fill="white" 
        fontSize="9.5" 
        fontWeight="900" 
        fontFamily="sans-serif" 
        textAnchor="middle"
        letterSpacing="0.5"
      >PDF</text>
    </svg>
  );

  // Custom high-fidelity SVG sort icons matching user screenshot
  const SortClockIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  const SortHistoryIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <polyline points="3 3 3 8 8 8" />
      <line x1="12" y1="7" x2="12" y2="12" strokeWidth="2" />
      <line x1="12" y1="12" x2="16" y2="12" strokeWidth="2" />
    </svg>
  );

  const SortNameAZIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <text x="1" y="9.5" fontSize="8" fontWeight="900" fontFamily="sans-serif" fill="currentColor">A</text>
      <text x="1" y="19.5" fontSize="8" fontWeight="900" fontFamily="sans-serif" fill="currentColor">Z</text>
      <path d="M15 5v13" />
      <path d="M11 14l4 4 4-4" />
    </svg>
  );

  const SortNameZAIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <text x="1" y="9.5" fontSize="8" fontWeight="900" fontFamily="sans-serif" fill="currentColor">A</text>
      <text x="1" y="19.5" fontSize="8" fontWeight="900" fontFamily="sans-serif" fill="currentColor">Z</text>
      <path d="M15 5v13" />
      <path d="M11 9l4-4 4 4" />
    </svg>
  );

  const SortCircleGapIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10a7 7 0 1 1-3.5-5.5" />
    </svg>
  );

  // Helper file format checkers
  const getFormatDetails = (doc: PDFDocument) => {
    const name = doc.name.toLowerCase();
    if (name.endsWith('.pdf')) return { label: 'PDF', bg: 'bg-red-600 text-white shadow-red-600/30' };
    if (name.endsWith('.csv') || name.endsWith('.xlsx')) return { label: 'CSV', bg: 'bg-emerald-600 text-white shadow-emerald-600/30' };
    if (name.endsWith('.docx') || doc.isWord) return { label: 'Word', bg: 'bg-blue-600 text-white shadow-blue-600/30' };
    if (name.endsWith('.pptx') || doc.isPPT) return { label: 'PPT', bg: 'bg-amber-600 text-white shadow-amber-600/30' };
    return { label: 'FILE', bg: 'bg-slate-500 text-white shadow-slate-500/30' };
  };

  // Dynamic Highlight formatter inside reader
  const getHighlightedText = (content: string, term: string) => {
    if (!term.trim()) return <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">{content}</pre>;
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = content.split(regex);
    return (
      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300">
        {parts.map((p, i) => p.toLowerCase() === term.toLowerCase() 
          ? <span key={i} className="bg-yellow-400 text-slate-950 font-extrabold px-0.5 rounded">{p}</span>
          : p
        )}
      </pre>
    );
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white flex flex-col items-center justify-center p-0 md:p-6 antialiased">
      
      {/* 📱 Main Phone frame viewport container */}
      <div 
        id="app-viewport-wrapper"
        className={`w-full md:w-[420px] h-screen md:h-[860px] flex flex-col relative overflow-hidden md:rounded-[48px] border-[8px] border-[#222222] shadow-2xl transition-colors duration-300 ${
          themeMode === 'dark' ? 'bg-[#121212] text-white' : 'bg-[#f4f5f6] text-slate-800'
        }`}
      >
        




        {/* ======================================= */}
        {/* SCREEN: ''LASH SCREEN                   */}
        {/* ======================================= */}
        {currentScreen === 'splash' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d0d] p-6 z-40">
            <div className="relative w-40 h-40 flex items-center justify-center mb-6 select-none">
              {/* Outer soft glowing halo */}
              <div className="absolute inset-2 bg-red-500/10 rounded-3xl blur-xl animate-pulse" />
              
              {/* Image Logo with styled frame */}
              <div className="relative w-36 h-36 bg-white rounded-[32px] p-2 shadow-2xl border-2 border-red-200 z-10 overflow-hidden flex items-center justify-center ring-4 ring-red-50/50 animate-bounce-slow">
                <img 
                  src={appLogo} 
                  alt="PDF Master Pro Logo" 
                  className="w-full h-full object-contain rounded-[24px]" 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Dynamic rotating outer compass ring */}
              <div className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '4s' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full text-red-500/25 opacity-80">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 6" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-black text-white tracking-widest text-center uppercase">
              PDF MASTER <span className='text-red-500'>PRO</span>
            </h2>
            <p className="text-slate-400 text-[10px] mt-1.5 uppercase tracking-widest font-mono">
              Premium System Suite v2.4
            </p>
          </div>
        )}

        {/* ======================================= */}
        {/* CORE APPLICATION ROUTING AND VIEWS       */}
        {/* ======================================= */}
        {currentScreen === 'app' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* 1. Header (Matches Screenshot layout) */}
            <div className={`px-4 pt-4 pb-3 flex items-center justify-between transition-colors duration-300 bg-red-600 text-white shadow-md z-20`}>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowDrawer(true)} 
                  className={`p-1.5 rounded-full transition-all hover:bg-white/20`}
                  title="Open Menu"
                >
                  <Menu className="w-5 h-5 text-white" />
                </button>
                <span className={`text-lg font-black tracking-wide text-white`}>
                  PDF Reader
                </span>
              </div>
              
              <div className="flex items-center gap-2.5 text-white">
                {/* Instant Theme Switch Toggle */}
                <button 
                  onClick={toggleTheme}
                  className={`p-1.5 rounded-full transition-all hover:bg-white/20`}
                  title="Switch theme"
                >
                  {themeMode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <button 
                  onClick={() => triggerNotification('👑 Pro unlocked via cloud credentials.')} 
                  className="hidden"
                >
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                </button>
              </div>
            </div>

            {/* ======================================= */}
            {/* VIEW A & B: ''ME SCREEN CONTENT          */}
            {/* ======================================= */}
            {activePage === 'home' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab !== 'tools' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* Search Bar with Filter */}
                    <div className={`px-4 pt-3 pb-2 transition-colors duration-300 ${
                      themeMode === 'dark' ? 'bg-[#121212]' : 'bg-white'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className={`absolute left-3 top-2.5 w-4 h-4 ${
                            themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'
                          }`} />
                          <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setSearchQuery('');
                              }
                            }}
                            className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs transition-all focus:outline-none ${
                              themeMode === 'dark' 
                                ? 'bg-[#252525] border border-[#333333] text-white placeholder-slate-500 focus:border-red-500/50' 
                                : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-red-500/50 shadow-sm'
                            }`}
                          />
                          {searchQuery && (
                            <button 
                              onClick={() => setSearchQuery('')} 
                              className="absolute right-3 top-2.5"
                              title="Clear query"
                            >
                              <X className={`w-3.5 h-3.5 ${
                                themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                              }`} />
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <button 
                            onClick={() => setShowSortMenu(!showSortMenu)} 
                            className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                              themeMode === 'dark' 
                                ? 'bg-[#252525] border-[#333333] text-slate-300 hover:text-white hover:bg-[#2a2a2a]' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-sm'
                            }`}
                            title="Sort options"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          
                          {showSortMenu && (
                            <>
                              <style>{`
                                @keyframes slideUp {
                                  from { transform: translateY(100%); }
                                  to { transform: translateY(0); }
                                }
                                @keyframes fadeIn {
                                  from { opacity: 0; }
                                  to { opacity: 1; }
                                }
                                .animate-slide-up {
                                  animation: slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                                }
                                .animate-fade-in {
                                  animation: fadeIn 0.2s ease-out forwards;
                                }
                              `}</style>
                              <div 
                                className="fixed inset-0 bg-black/60 backdrop-blur-[1.5px] z-[200] transition-opacity duration-300 animate-fade-in"
                                onClick={() => setShowSortMenu(false)}
                              />
                              <div 
                                className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto rounded-t-[32px] shadow-2xl z-[201] overflow-hidden pb-8 animate-slide-up ${
                                  themeMode === 'dark' 
                                    ? 'bg-[#181818] border-t border-[#2d2d2d]' 
                                    : 'bg-white border-t border-slate-100'
                                }`}
                              >
                                {/* Center pull handle bar */}
                                <div className={`w-12 h-1 rounded-full mx-auto mt-4 mb-2 ${
                                  themeMode === 'dark' ? 'bg-[#3a3a3a]' : 'bg-slate-200'
                                }`} />
                                
                                <div className={`px-6 py-4 text-base font-extrabold tracking-tight ${
                                  themeMode === 'dark' ? 'text-white' : 'text-slate-900'
                                }`}>
                                  Sort By
                                </div>
                                
                                <div className="space-y-0.5">
                                  {([
                                    { id: 'date_newest', label: 'Date Modified (Newest)', icon: SortClockIcon },
                                    { id: 'date_oldest', label: 'Date Modified (Oldest)', icon: SortHistoryIcon },
                                    { id: 'name_az', label: 'Name (A to Z)', icon: SortNameAZIcon },
                                    { id: 'name_za', label: 'Name (Z to A)', icon: SortNameZAIcon },
                                    { id: 'size_largest', label: 'Size (Largest)', icon: SortCircleGapIcon },
                                    { id: 'size_smallest', label: 'Size (Smallest)', icon: SortCircleGapIcon }
                                  ] as const).map(option => {
                                    const isSelected = sortBy === option.id;
                                    const IconComponent = option.icon;
                                    
                                    return (
                                      <button
                                        key={option.id}
                                        onClick={() => {
                                          setSortBy(option.id);
                                          setShowSortMenu(false);
                                          triggerNotification(`🔄 Sorted by ${option.label}`);
                                        }}
                                        className={`w-full flex items-center gap-4 px-6 py-3.5 text-xs font-bold transition-all text-left border-none outline-none ${
                                          isSelected 
                                            ? 'text-red-500' 
                                            : themeMode === 'dark' ? 'text-slate-300 hover:bg-[#252525]' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        <div className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
                                          isSelected 
                                            ? 'text-red-500' 
                                            : themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                        }`}>
                                          <IconComponent className="w-5 h-5" />
                                        </div>
                                        <span className="flex-1 text-sm font-medium">{option.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Scrollable Category horizontal bar */}
                    <div className={`grid grid-cols-5 border-b select-none transition-colors duration-300 ${
                      themeMode === 'dark' ? 'bg-[#121212] border-[#1c1c1c]' : 'bg-white border-slate-100'
                    }`}>
                      {(['All', 'PDF', 'Word', 'Excel', 'PPT'] as const).map(cat => {
                        const isActive = activeCategory === cat;
                        // Define active text and underline classes based on the category and theme
                        let activeTextClass = '';
                        let activeLineClass = '';
                        
                        if (cat === 'All') {
                          activeTextClass = themeMode === 'dark' ? 'text-white' : 'text-slate-900';
                          activeLineClass = themeMode === 'dark' ? 'bg-white' : 'bg-slate-900';
                        } else if (cat === 'PDF') {
                          activeTextClass = themeMode === 'dark' ? 'text-red-500' : 'text-red-600';
                          activeLineClass = themeMode === 'dark' ? 'bg-red-500' : 'bg-red-600';
                        } else if (cat === 'Word') {
                          activeTextClass = themeMode === 'dark' ? 'text-blue-400' : 'text-[#1b5cb1]';
                          activeLineClass = themeMode === 'dark' ? 'bg-blue-400' : 'bg-[#1b5cb1]';
                        } else if (cat === 'Excel') {
                          activeTextClass = themeMode === 'dark' ? 'text-emerald-400' : 'text-[#107c41]';
                          activeLineClass = themeMode === 'dark' ? 'bg-emerald-400' : 'bg-[#107c41]';
                        } else if (cat === 'PPT') {
                          activeTextClass = themeMode === 'dark' ? 'text-amber-500' : 'text-[#d83b01]';
                          activeLineClass = themeMode === 'dark' ? 'bg-amber-500' : 'bg-[#d83b01]';
                        }

                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              setActiveCategory(cat);
                              triggerNotification(`📂 Cabinet: ${cat}`);
                            }}
                            className={`flex flex-col items-center justify-center py-2.5 text-xs font-bold transition-all relative ${
                              isActive 
                                ? activeTextClass 
                                : themeMode === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            <span>{cat}</span>
                            {isActive && (
                              <div className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${activeLineClass}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* 3. Files Scroll List Container */}
                    <div className="flex-1 px-4 py-3 overflow-y-auto space-y-2.5">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                          {activeTab === 'recent' ? 'Recently Opened' : activeTab === 'bookmarks' ? 'Bookmarks' : 'File Cabinet'}
                        </span>
                        <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-bold">
                          {getSortedDocs(documents).length} Assets
                        </span>
                      </div>

                      {/* Simulated Native AD skeleton matching design exactly */}
                      {getSortedDocs(documents).length > 2 && (
                        <div className={`p-4 border rounded-2xl relative overflow-hidden ${
                          themeMode === 'dark' ? 'bg-[#181818] border-[#252525]' : 'bg-white border-slate-200 shadow-sm'
                        }`}>
                          <div className="absolute top-2 left-2 bg-[#2d2d2d] border border-[#3d3d3d] text-slate-400 font-bold text-[8px] px-1.5 py-0.5 rounded">AD</div>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="w-18 h-18 rounded-2xl bg-white border-2 border-red-100 flex items-center justify-center p-1 shadow-md overflow-hidden ring-4 ring-red-50/50">
                              <img 
                                src={appLogo} 
                                alt="Ad logo" 
                                className="w-full h-full object-contain rounded-xl" 
                                referrerPolicy="no-referrer" 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-[11px] font-extrabold block truncate ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>PDF Master Pro Suite Premium Edition</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">Edit, Compress and Secure PDF files dynamically. No limits.</span>
                            </div>
                            <button onClick={() => triggerNotification('👑 Pro unlocked successfully!')} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold text-[9px] rounded-lg">PRO</button>
                          </div>
                        </div>
                      )}

                      {/* Documents Loop list */}
                      <div className={`overflow-hidden rounded-2xl border ${
                        themeMode === 'dark' ? 'bg-[#181818] border-[#252525]' : 'bg-white border-slate-100 shadow-sm'
                      }`}>
                        {getSortedDocs(documents).length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                            <FileText className="w-10 h-10 stroke-1 opacity-40 text-slate-400" />
                            <p>No documents found in this category.</p>
                            <button 
                              onClick={() => fetchSystemData()}
                              className="text-xs text-red-500 hover:underline font-bold"
                            >
                              Reset Repository Seed
                            </button>
                          </div>
                        ) : (
                          getSortedDocs(documents).map((doc, idx, arr) => {
                            const isWord = doc.isWord || doc.name.toLowerCase().endsWith('.docx') || doc.name.toLowerCase().endsWith('.doc');
                            const isExcel = doc.name.toLowerCase().endsWith('.xlsx') || doc.name.toLowerCase().endsWith('.xls') || doc.name.toLowerCase().endsWith('.csv');
                            const isPpt = doc.isPPT || doc.name.toLowerCase().endsWith('.pptx') || doc.name.toLowerCase().endsWith('.ppt');
                            const isPdf = doc.name.toLowerCase().endsWith('.pdf');
                            const isLocked = doc.isLocked;

                            // Dynamic icon selection
                            let fileIcon;
                            if (isLocked) {
                              fileIcon = (
                                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#252525] flex items-center justify-center border border-slate-200 dark:border-[#333333]">
                                  <Lock className="w-5 h-5 text-slate-400" />
                                </div>
                              );
                            } else if (isWord) {
                              fileIcon = <WordIcon />;
                            } else if (isExcel) {
                              fileIcon = <ExcelIcon />;
                            } else if (isPpt) {
                              fileIcon = <PptIcon />;
                            } else if (isPdf) {
                              fileIcon = <PdfIcon />;
                            } else {
                              fileIcon = (
                                <svg viewBox="0 0 48 48" className="w-11 h-11 text-slate-500" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="2" y="2" width="44" height="44" rx="10" fill="#f1f3f4" />
                                  <path d="M14 14H34V34H14V14Z" fill="white" stroke="#5f6368" strokeWidth="2" strokeLinejoin="round" />
                                </svg>
                              );
                            }

                            return (
                              <div
                                key={doc.id}
                                onClick={() => handleDocClick(doc)}
                                className={`p-3.5 flex items-center justify-between transition-all cursor-pointer group ${
                                  themeMode === 'dark' 
                                    ? 'hover:bg-[#222222]' 
                                    : 'hover:bg-slate-50/80'
                                } ${idx < arr.length - 1 ? (themeMode === 'dark' ? 'border-b border-[#252525]' : 'border-b border-slate-100') : ''}`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  {fileIcon}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <h4 className={`text-xs font-bold truncate group-hover:text-red-500 transition-colors ${
                                        themeMode === 'dark' ? 'text-slate-100' : 'text-slate-800'
                                      }`}>
                                        {doc.name}
                                      </h4>
                                      {doc.isBookmarked && (
                                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                      <span>{getRelativeDateString(doc.created)}</span>
                                      <span>·</span>
                                      <span>{doc.size}</span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDropdownDoc(doc);
                                  }}
                                  className={`p-2 rounded-lg transition-colors ml-2 ${
                                    themeMode === 'dark' ? 'hover:bg-[#2b2b2b] text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                                  }`}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* 5. Floating Action Button (FAB) */}
                    <button
                      onClick={() => setShowFabMenu(true)}
                      className="absolute bottom-20 right-6 w-14 h-14 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white shadow-2xl transition-all cursor-pointer hover:scale-105 z-20"
                    >
                      <Plus className="w-7 h-7 stroke-[3px]" />
                    </button>
                  </div>
                )}

                {/* ======================================= */}
                {/* VIEW B: ''OLS GRID SCREEN                */}
                {/* ======================================= */}
                {activeTab === 'tools' && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    
                    {/* Section A: pinvert */}
                    <div className="space-y-3">
                      <h3 className={`text-sm font-extrabold tracking-wide border-l-2 border-red-500 pl-2 ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Convert</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'image_to_pdf', title: 'Image to PDF', color: 'bg-red-500/10 text-red-500', icon: FileImage },
                          { id: 'scan_to_pdf', title: 'Scan to PDF', color: 'bg-blue-500/10 text-blue-500', icon: Crop },
                          { id: 'id_card', title: 'ID Card', color: 'bg-amber-500/10 text-amber-500', icon: Layers },
                          { id: 'word_to_pdf', title: 'Word to PDF', color: 'bg-indigo-500/10 text-indigo-500', icon: BookOpen },
                          { id: 'pdf_to_word', title: 'PDF to Word', color: 'bg-purple-500/10 text-purple-500', icon: ArrowLeftRight },
                          { id: 'pdf_to_image', title: 'PDF to Image', color: 'bg-red-500/10 text-red-500', icon: FileImage },
                          { id: 'pdf_to_long_image', title: 'PDF to Long Image', color: 'bg-amber-500/10 text-amber-500', icon: Compass },
                          { id: 'image_to_text', title: 'Image to Text', color: 'bg-emerald-500/10 text-emerald-500', icon: Sparkles, hasAd: true }
                        ].map(tool => (
                          <button
                            key={tool.id}
                            onClick={() => {
                              setActiveTool(tool.id);
                              if (tool.id === 'image_to_text') loadOcrSample('receipt');
                            }}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all relative text-center min-h-[90px] ${
                              themeMode === 'dark' ? 'bg-[#1a1a1a] border-[#252525] hover:bg-[#252525]' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
                            {(tool as any).hasAd && (
                              <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 font-bold text-[6px] px-1 rounded uppercase">AD</div>
                            )}
                            {(tool as any).badge && (
                              <div className="absolute top-1 right-1 bg-red-500 text-white font-bold text-[6px] px-1 rounded uppercase">{(tool as any).badge}</div>
                            )}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 ${tool.color}`}>
                              <tool.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-semibold leading-tight block truncate w-full px-0.5 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              {tool.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section B: edit */}
                    <div className="space-y-3">
                      <h3 className={`text-sm font-extrabold tracking-wide border-l-2 border-red-500 pl-2 ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Edit</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'edit_text', title: 'Edit Text', color: 'bg-blue-500/10 text-blue-500', icon: Edit },
                          { id: 'annotate', title: 'Annotate', color: 'bg-purple-500/10 text-purple-500', icon: PenTool },
                          { id: 'sign', title: 'Sign', color: 'bg-emerald-500/10 text-emerald-500', icon: PenTool },
                          { id: 'merge_files', title: 'Merge PDF', color: 'bg-amber-500/10 text-amber-500', icon: ArrowLeftRight },
                          { id: 'split', title: 'Split PDF', color: 'bg-red-500/10 text-red-500', icon: FileDown },
                          { id: 'compress', title: 'Compress PDF', color: 'bg-emerald-500/10 text-emerald-500', icon: Layers },
                          { id: 'add_text', title: 'Add Text', color: 'bg-blue-500/10 text-blue-500', icon: Edit },
                          { id: 'add_watermark', title: 'Add Watermark', color: 'bg-purple-500/10 text-purple-500', icon: Droplet }
                        ].map(tool => (
                          <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center relative min-h-[90px] ${
                              themeMode === 'dark' ? 'bg-[#1a1a1a] border-[#252525] hover:bg-[#252525]' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
                            {(tool as any).hasAd && (
                              <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 font-bold text-[6px] px-1 rounded uppercase">AD</div>
                            )}
                            {(tool as any).badge && (
                              <div className="absolute top-1 right-1 bg-red-500 text-white font-bold text-[6px] px-1 rounded uppercase">{(tool as any).badge}</div>
                            )}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 ${tool.color}`}>
                              <tool.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-semibold leading-tight block truncate w-full px-0.5 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              {tool.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section C: image */}
                    <div className="space-y-3">
                      <h3 className={`text-sm font-extrabold tracking-wide border-l-2 border-red-500 pl-2 ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Manage</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'import', title: 'Import files', color: 'bg-blue-500/10 text-blue-500', icon: Folder },
                          { id: 'create_pdf', title: 'Create PDF', color: 'bg-red-500/10 text-red-500', icon: FileText },
                          { id: 'print', title: 'Print PDF', color: 'bg-amber-500/10 text-amber-500', icon: Printer },
                          { id: 'lock_pdf', title: 'Lock PDF', color: 'bg-blue-500/10 text-blue-500', icon: Lock },
                          { id: 'unlock_pdf', title: 'Unlock PDF', color: 'bg-purple-500/10 text-purple-500', icon: Unlock },
                          { id: 'recycle_bin', title: 'Recycle Bin', color: 'bg-emerald-500/10 text-emerald-500', icon: Trash2, badge: 'NEW' }
                        ].map(tool => (
                          <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center relative min-h-[90px] ${
                              themeMode === 'dark' ? 'bg-[#1a1a1a] border-[#252525] hover:bg-[#252525]' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
                            {(tool as any).hasAd && (
                              <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 font-bold text-[6px] px-1 rounded uppercase">AD</div>
                            )}
                            {(tool as any).badge && (
                              <div className="absolute top-1 right-1 bg-red-500 text-white font-bold text-[6px] px-1 rounded uppercase">{(tool as any).badge}</div>
                            )}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 ${tool.color}`}>
                              <tool.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-[10px] font-semibold leading-tight block truncate w-full px-0.5 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              {tool.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================= */}
            {/* VIEW C: ''TTINGS AND THEME TOGGLE VIEW */}
            {/* ======================================= */}
            {activePage === 'settings' && (
              <div className={`flex-1 overflow-y-auto p-4 space-y-4 transition-colors duration-300 select-none ${
                themeMode === 'dark' ? 'bg-[#121214] text-white' : 'bg-[#f3f4f6] text-slate-800'
              }`}>
                {/* Clean, Premium Native Header */}
                <div className="flex items-center gap-2 pb-2.5">
                  <button 
                    onClick={() => setActivePage('home')}
                    className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer text-sm ${
                      themeMode === 'dark' ? 'text-white hover:text-slate-300' : 'text-slate-900 hover:text-slate-700'
                    }`}
                  >
                    <ArrowLeft className="w-5 h-5 text-red-500" />
                    <span className="text-base font-black tracking-tight">Settings</span>
                  </button>
                </div>

                {/* GROUP 1: FILE SYSTEM & DEVICE CONFIGS */}
                <div className={`rounded-2xl overflow-hidden border shadow-sm ${
                  themeMode === 'dark' ? 'bg-[#1c1c1e] border-slate-800/80' : 'bg-white border-slate-200'
                } divide-y ${themeMode === 'dark' ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                  {/* Item 1: file manager */}
                  <button
                    onClick={() => setShowFileManagerModal(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-4.5 h-4.5 text-red-500" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>File manager</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* Item 2: keep screen on */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 text-left transition-colors ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Eye className="w-4.5 h-4.5 text-emerald-500" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Keep screen on</span>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !keepScreenOn;
                        setKeepScreenOn(nextVal);
                        localStorage.setItem('keep_screen_on', String(nextVal));
                        triggerNotification(nextVal ? '💡 Screen timeout disabled. Keep screen on active.' : 'Screen timeout restored to system defaults.');
                      }}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 relative flex items-center ${
                        keepScreenOn ? 'bg-red-600' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        keepScreenOn ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Item 3: scan settings */}
                  <button
                    onClick={() => setShowScanSettingsModal(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sliders className="w-4.5 h-4.5 text-blue-500" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Scan settings</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* Item 4: share app */}
                  <button
                    onClick={() => {
                      setShowWidgetModal(false); // Make sure other modals are clean
                      triggerNotification('🔗 Preparing sharing dialog...');
                      if (navigator.share) {
                        navigator.share({
                          title: 'PDF Master Pro',
                          text: 'Convert, sign, crop, compress, and scan documents with ease on PDF Master Pro!',
                          url: window.location.href,
                        }).then(() => {
                          triggerNotification('✨ App shared successfully!');
                        }).catch(() => {});
                      } else {
                        // Custom simulation
                        setShowWidgetModal(true); // Share modal
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Share2 className="w-4.5 h-4.5 text-amber-500" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Share app</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* GROUP 2: SECURITY SETTINGS */}
                <div className={`rounded-2xl overflow-hidden border shadow-sm ${
                  themeMode === 'dark' ? 'bg-[#1c1c1e] border-slate-800/80' : 'bg-white border-slate-200'
                }`}>
                  <div
                    className={`flex items-center justify-between px-4 py-3 text-left transition-colors ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-4.5 h-4.5 text-indigo-500" />
                      <div className="text-left">
                        <span className={`text-[13px] font-semibold block leading-tight ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Security question</span>
                        <span className="text-[10px] text-slate-400 block">Help reset your password</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !securityQuestion;
                        if (nextVal) {
                          setShowSecurityQuestionSetupModal(true);
                        } else {
                          setSecurityQuestion(false);
                          localStorage.setItem('security_question', 'false');
                          triggerNotification('🔒 Password recovery option disabled.');
                        }
                      }}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 relative flex items-center ${
                        securityQuestion ? 'bg-red-600' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        securityQuestion ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* GROUP 3: APP PREFERENCES */}
                <div className={`rounded-2xl overflow-hidden border shadow-sm ${
                  themeMode === 'dark' ? 'bg-[#1c1c1e] border-slate-800/80' : 'bg-white border-slate-200'
                } divide-y ${themeMode === 'dark' ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                  
                  {/* Theme Selector Row */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowThemeDropdown(!showThemeDropdown);
                        setShowLanguageDropdown(false);
                        setShowReaderDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                        themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Moon className="w-4.5 h-4.5 text-cyan-500" />
                        <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Theme</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-medium">{themeSetting}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </button>
                    {showThemeDropdown && (
                      <div className={`absolute right-4 top-12 w-48 rounded-2xl shadow-xl z-30 border ${
                        themeMode === 'dark' ? 'bg-[#25252a] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } py-1.5 overflow-hidden animate-fade-in`}>
                        {['System default', 'Light Mode', 'Dark Mode'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setThemeSetting(opt);
                              localStorage.setItem('theme_setting', opt);
                              if (opt === 'Dark Mode') {
                                setThemeMode('dark');
                                localStorage.setItem('theme_mode', 'dark');
                              } else if (opt === 'Light Mode') {
                                setThemeMode('light');
                                localStorage.setItem('theme_mode', 'light');
                              } else {
                                const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                setThemeMode(sysDark ? 'dark' : 'light');
                              }
                              setShowThemeDropdown(false);
                              triggerNotification(`🎨 Theme set to ${opt}`);
                            }}
                            className={`w-full px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer transition-colors ${
                              themeSetting === opt 
                                ? 'bg-red-500/15 text-red-500 font-bold' 
                                : themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt}</span>
                            {themeSetting === opt && <Check className="w-3.5 h-3.5 text-red-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Language Selector Row */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowLanguageDropdown(!showLanguageDropdown);
                        setShowThemeDropdown(false);
                        setShowReaderDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                        themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-4.5 h-4.5 text-purple-500" />
                        <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Language options</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-medium">{language}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </button>
                    {showLanguageDropdown && (
                      <div className={`absolute right-4 top-12 w-48 rounded-2xl shadow-xl z-30 border ${
                        themeMode === 'dark' ? 'bg-[#25252a] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } py-1.5 overflow-hidden animate-fade-in`}>
                        {['English', 'Español', 'Français', 'Deutsch', 'Português', 'Русский'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setLanguage(opt);
                              localStorage.setItem('language_setting', opt);
                              setShowLanguageDropdown(false);
                              triggerNotification(`🌐 Language set to ${opt}`);
                            }}
                            className={`w-full px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer transition-colors ${
                              language === opt 
                                ? 'bg-red-500/15 text-red-500 font-bold' 
                                : themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt}</span>
                            {language === opt && <Check className="w-3.5 h-3.5 text-red-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Default Reader Row */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowReaderDropdown(!showReaderDropdown);
                        setShowThemeDropdown(false);
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                        themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4.5 h-4.5 text-sky-500" />
                        <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Default reader</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-medium truncate max-w-[120px]">{defaultReader}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </button>
                    {showReaderDropdown && (
                      <div className={`absolute right-4 top-12 w-52 rounded-2xl shadow-xl z-30 border ${
                        themeMode === 'dark' ? 'bg-[#25252a] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } py-1.5 overflow-hidden animate-fade-in`}>
                        {['Built-in PDF Viewer', 'System Default Reader', 'Ask Every Time'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setDefaultReader(opt);
                              localStorage.setItem('default_reader_setting', opt);
                              setShowReaderDropdown(false);
                              triggerNotification(`📖 Default reader set to ${opt}`);
                            }}
                            className={`w-full px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer transition-colors ${
                              defaultReader === opt 
                                ? 'bg-red-500/15 text-red-500 font-bold' 
                                : themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt}</span>
                            {defaultReader === opt && <Check className="w-3.5 h-3.5 text-red-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notifications Switch Row */}
                  <div
                    className={`flex items-center justify-between px-4 py-3 text-left transition-colors ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-4.5 h-4.5 text-orange-500" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Notifications</span>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !notifications;
                        setNotifications(nextVal);
                        localStorage.setItem('notifications', String(nextVal));
                        triggerNotification(nextVal ? '🔔 Push notifications enabled.' : 'Push notifications muted.');
                      }}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 relative flex items-center ${
                        notifications ? 'bg-red-600' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        notifications ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Add widget Row */}
                  <button
                    onClick={() => setShowWidgetModal(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Grid className="w-4.5 h-4.5 text-teal-500" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Add widget</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* GROUP 4: HELP, REVIEWS & SOCIAL */}
                <div className={`rounded-2xl overflow-hidden border shadow-sm ${
                  themeMode === 'dark' ? 'bg-[#1c1c1e] border-slate-800/80' : 'bg-white border-slate-200'
                } divide-y ${themeMode === 'dark' ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                  
                  {/* Feature Request */}
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4.5 h-4.5 text-yellow-500 animate-pulse" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Request more features</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* FAQ Accordion */}
                  <button
                    onClick={() => setShowFaqModal(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4.5 h-4.5 text-indigo-400" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>FAQ</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* Rate Us */}
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Star className="w-4.5 h-4.5 text-amber-400" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Rate us</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* Centered Version Bottom Tag */}
                <div className="text-center pt-3 pb-8 select-none">
                  <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">Version: '9.9C'</span>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* VIEW D: ''NAMIC MARKDOWN CONTENT PAGES  */}
            {/* ======================================= */}
            {activePage !== 'home' && activePage !== 'settings' && (
              <div className={`flex-1 overflow-y-auto p-5 space-y-5 transition-colors duration-300 ${
                themeMode === 'dark' ? 'bg-[#121212] text-white' : 'bg-white text-slate-800'
              }`}>
                {/* Header title */}
                <div className="flex items-center gap-3 pb-3 border-b border-red-500/10">
                  <FileText className="w-5 h-5 text-red-500" />
                  <h3 className={`text-sm font-black uppercase tracking-wider capitalize ${themeMode === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                    {activePage.replace(/_/g, ' ')}
                  </h3>
                </div>

                {/* Big Premium Brand Logo Banner inside dynamic page */}
                <div className={`p-4 rounded-3xl border flex items-center gap-4 ${
                  themeMode === 'dark' ? 'bg-[#181818] border-[#222222]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-24 h-24 bg-white rounded-3xl border-2 border-red-200 flex items-center justify-center p-1.5 shadow-xl overflow-hidden ring-4 ring-red-50/50">
                    <img 
                      src={appLogo} 
                      alt="PDF Master Pro" 
                      className="w-full h-full object-contain rounded-2xl" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div>
                    <h4 className={`text-xs font-black ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>PDF Master Pro</h4>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-mono">Dynamic Server Document</p>
                  </div>
                </div>

                {/* Display Content Container */}
                <div className={`p-5 rounded-3xl border text-xs leading-relaxed space-y-4 font-sans ${
                  themeMode === 'dark' ? 'bg-[#0f0f0f] border-[#222222] text-slate-300' : 'bg-slate-50/50 border-slate-200 text-slate-700'
                }`}>
                  <div className="whitespace-pre-line text-left leading-relaxed">
                    {config?.pages?.[activePage] || config?.pages?.[activePage === 'privacy' ? 'privacy' : activePage === 'terms' ? 'terms' : 'about'] || "Dynamic page content loading from database server..."}
                  </div>
                </div>

                {/* Interactive Contact support form if page is contact */}
                {activePage === 'contact' && (
                  <div className={`p-4 rounded-3xl border space-y-3 ${
                    themeMode === 'dark' ? 'bg-[#181818] border-[#222222]' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block">Submit Support Request</span>
                    <input 
                      type="text" 
                      placeholder="Your registered email address" 
                      className={`w-full p-2.5 rounded-xl text-xs outline-none ${
                        themeMode === 'dark' ? 'bg-[#252525] text-white border-[#333]' : 'bg-slate-50 text-slate-900 border-slate-200'
                      }`} 
                    />
                    <textarea 
                      placeholder="Detail your request or bug description..." 
                      rows={3} 
                      className={`w-full p-2.5 rounded-xl text-xs outline-none resize-none ${
                        themeMode === 'dark' ? 'bg-[#252525] text-white border-[#333]' : 'bg-slate-50 text-slate-900 border-slate-200'
                      }`}
                    />
                    <button 
                      onClick={() => triggerNotification('📨 Ticket created. Enterprise Support SLA initiated!')} 
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl"
                    >
                      Submit SLA Ticket
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setActivePage('home')}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
                >
                  Return to Home Library
                </button>
              </div>
            )}

            {/* ======================================= */}
            {/* DYNAMIC NAVIGATION DRAWER (MATERIAL 3)  */}
            {/* ======================================= */}
            {showDrawer && (
              <div className="absolute inset-0 bg-black/75 z-50 flex animate-fade-in">
                {/* Click outside to close */}
                <div className="absolute inset-0" onClick={() => setShowDrawer(false)} />
                
                {/* Drawer sheet content */}
                <div className={`relative w-[280px] h-full flex flex-col shadow-2xl animate-slide-right ${
                  themeMode === 'dark' ? 'bg-[#151515] text-white border-r border-[#252525]' : 'bg-white text-slate-800 border-r border-slate-200'
                }`}>
                  
                  {/* Drawer Header with generated Logo */}
                  <div className={`p-5 flex flex-col gap-4 border-b ${
                    themeMode === 'dark' ? 'bg-[#1a1a1a] border-[#252525]' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="relative w-20 h-20 bg-white rounded-[24px] border-2 border-red-200 shadow-lg flex items-center justify-center p-1.5 overflow-hidden ring-4 ring-red-50/50 flex-shrink-0">
                        <img 
                          src={appLogo} 
                          alt="PDF Master Pro" 
                          className="w-full h-full object-contain rounded-[16px]" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                      <div>
                        <h3 className={`text-sm font-black tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>PDF Master Pro</h3>
                        <span className="text-[10px] text-red-500 font-extrabold tracking-widest uppercase">Premium Suite</span>
                      </div>
                    </div>
                    
                    {/* Status indicator */}
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Database Sync</span>
                      </div>
                      <span className="text-[8px] font-mono text-slate-500">Live v2.4</span>
                    </div>
                  </div>

                  {/* Navigation lists */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 select-none text-left">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block px-2 mb-1">Navigation Menu</span>
                    
                    {/* Render Home route */}
                    <button
                      onClick={() => {
                        setActivePage('home');
                        setShowDrawer(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        activePage === 'home'
                          ? 'bg-red-500 text-white shadow-lg'
                          : themeMode === 'dark' ? 'hover:bg-[#252525] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Folder className="w-4 h-4" />
                      <span>Home (Files)</span>
                    </button>

                    {/* Render backend dynamic menu items */}
                    {config?.navigation?.filter(nav => nav.enabled && nav.route !== '/home').map(nav => {
                      const isPageActive = activePage === nav.route.replace('/', '');
                      return (
                        <button
                          key={nav.id}
                          onClick={() => {
                            setActivePage(nav.route.replace('/', ''));
                            setShowDrawer(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                            isPageActive
                              ? 'bg-red-500 text-white shadow-lg'
                              : themeMode === 'dark' ? 'hover:bg-[#252525] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {nav.icon === 'Info' && <Info className="w-4 h-4" />}
                          {nav.icon === 'PhoneCall' && <PhoneCall className="w-4 h-4" />}
                          {nav.icon === 'ShieldAlert' && <ShieldAlert className="w-4 h-4" />}
                          {nav.icon === 'BookOpen' && <BookOpen className="w-4 h-4" />}
                          {!['Info', 'PhoneCall', 'ShieldAlert', 'BookOpen'].includes(nav.icon) && <FileText className="w-4 h-4" />}
                          <span>{nav.title}</span>
                        </button>
                      );
                    })}

                    <div className="border-t border-slate-700/20 my-3" />

                    {/* Settings Section */}
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block px-2 mb-1">System Controls</span>

                    <button
                      onClick={() => {
                        setActivePage('settings');
                        setShowDrawer(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        activePage === 'settings'
                          ? 'bg-red-500 text-white shadow-lg'
                          : themeMode === 'dark' ? 'hover:bg-[#252525] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                  </div>

                  {/* Drawer Footer info */}
                  <div className={`p-4 text-center border-t select-none ${
                    themeMode === 'dark' ? 'border-[#252525] text-slate-500' : 'border-slate-100 text-slate-400'
                  }`}>
                    <span className="text-[9px] block font-mono font-semibold">PDF MASTER PRO v2.4.0</span>
                    <span className="text-[8px] block mt-0.5">Crafted with full-stack server intelligence</span>
                  </div>
                </div>
              </div>
            )}

            {/* Persistent Bottom Navigation Bar (Matches Screenshot) */}
            <div className={`h-16 border-t flex items-center justify-around select-none z-10 transition-colors duration-300 ${
              themeMode === 'dark' ? 'bg-[#161616] border-[#222222]' : 'bg-white border-slate-200'
            }`}>
              {[
                { id: 'files', label: 'Files', icon: Folder },
                { id: 'recent', label: 'Recent', icon: FileText },
                { id: 'bookmarks', label: 'Bookmarks', icon: Star },
                { id: 'tools', label: 'Tools', icon: Grid }
              ].map(tab => {
                const isActive = activePage === 'home' && activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActivePage('home');
                      setActiveTab(tab.id as any);
                      setActiveTool(null);
                    }}
                    className={`flex flex-col items-center justify-center w-20 h-full transition-colors ${
                      isActive ? 'text-red-500 font-extrabold' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mb-1" />
                    <span className="text-[9px] font-bold tracking-tight">{tab.label}</span>
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {/* ======================================= */}
        {/* INTERACTIVE FULL SCREEN TOOL OVERLAYS    */}
        {/* ======================================= */}
        {activeTool && (
          <div className={`absolute inset-0 flex flex-col z-30 animate-slide-up transition-colors duration-300 ${
            themeMode === 'dark' ? 'bg-[#121212] text-white' : 'bg-[#f8f9fa] text-slate-800'
          }`}>
            
            {/* Header bar */}
            <div className={`px-4 py-3.5 border-b flex items-center gap-3 ${
              themeMode === 'dark' ? 'border-[#222222] bg-[#1a1a1a] text-white' : 'border-slate-200 bg-white text-slate-800'
            }`}>
              <button 
                onClick={() => setActiveTool(null)} 
                className={`p-1.5 rounded-xl transition-colors ${
                  themeMode === 'dark' ? 'bg-[#252525] text-white hover:bg-[#353535]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold tracking-tight capitalize">{activeTool.replace(/_/g, ' ')}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* IMAGE TO TEXT / GEMINI OCR */}
              {activeTool === 'image_to_text' && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-emerald-400 block">Gemini OCR Engine</span>
                    <p className={`text-[11px] leading-relaxed ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Extract perfectly aligned text from screenshots or reports via server-side Gemini intelligence.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Scanner Targets</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => loadOcrSample('receipt')} 
                        className={`p-2.5 rounded-xl border text-left transition-colors ${
                          themeMode === 'dark' ? 'border-[#2a2a2a] bg-[#1a1a1a]' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className={`text-xs font-bold block ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Coffee Bill Scan</span>
                        <span className="text-[9px] text-slate-500">Retail metadata</span>
                      </button>
                      <button 
                        onClick={() => loadOcrSample('report')} 
                        className={`p-2.5 rounded-xl border text-left transition-colors ${
                          themeMode === 'dark' ? 'border-[#2a2a2a] bg-[#1a1a1a]' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className={`text-xs font-bold block ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Corporate Statement</span>
                        <span className="text-[9px] text-slate-500">Table layouts</span>
                      </button>
                    </div>
                  </div>

                  {ocrImage && (
                    <div className={`p-3 border rounded-xl flex items-center justify-between ${
                      themeMode === 'dark' ? 'bg-[#181818] border-[#222222]' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <span className={`text-xs ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Target: <strong className="text-red-500">{ocrDocName}</strong></span>
                      <select 
                        value={ocrLanguage} 
                        onChange={e => setOcrLanguage(e.target.value)} 
                        className={`text-[10px] font-bold p-1 rounded outline-none ${
                          themeMode === 'dark' ? 'bg-[#252525] text-white' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <option value="English">English</option>
                        <option value="Sinhala">Sinhala</option>
                        <option value="Spanish">Spanish</option>
                      </select>
                    </div>
                  )}

                  <button 
                    disabled={ocrLoading} 
                    onClick={processOCR}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {ocrLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{ocrLoading ? 'Extracting via Gemini API...' : 'Run Server-Side OCR'}</span>
                  </button>

                  {ocrResult && (
                    <div className={`p-4 rounded-2xl border space-y-2 ${
                      themeMode === 'dark' ? 'bg-[#0a0a0a] border-[#222222]' : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      <div className={`flex justify-between items-center border-b pb-2 ${themeMode === 'dark' ? 'border-[#222222]' : 'border-slate-100'}`}>
                        <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase">OCR Text</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(ocrResult);
                            triggerNotification('📋 Extracted text copied!');
                          }} 
                          className={`text-[9px] px-2 py-0.5 rounded ${
                            themeMode === 'dark' ? 'bg-[#1a1a1a] text-slate-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Copy
                        </button>
                      </div>
                      <textarea 
                        value={ocrResult} 
                        onChange={e => setOcrResult(e.target.value)} 
                        rows={6} 
                        className={`w-full bg-transparent text-xs font-mono resize-none outline-none border-none leading-relaxed ${
                          themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`} 
                      />
                    </div>
                  )}
                </div>
              )}

              {/* CAMERA SCANNER */}
              {activeTool === 'scan_to_pdf' && (
                <div className="space-y-4 text-center">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-left">
                    <span className="text-xs font-bold text-blue-400 block">Simulated Smart Lens Scanner</span>
                    <p className={`text-[11px] leading-relaxed ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Auto-detect document boundaries and shadows inside your viewport camera grid.
                    </p>
                  </div>

                  <div className={`aspect-[3/4] max-w-xs mx-auto rounded-2xl border-2 border-dashed relative overflow-hidden flex flex-col items-center justify-center ${
                    themeMode === 'dark' ? 'bg-[#1a1a1a] border-[#333333]' : 'bg-white border-slate-300 shadow-sm'
                  }`}>
                    {scanStage === 'preview' ? (
                      <>
                        <div className="absolute inset-4 border border-red-500/40 rounded-xl" />
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/60 animate-bounce" />
                        <Camera className="w-12 h-12 text-slate-600 mb-2 animate-pulse" />
                        <span className="text-[10px] text-slate-500">Position document inside grid</span>
                        <button onClick={triggerCameraCapture} className="absolute bottom-6 w-12 h-12 bg-red-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg cursor-pointer" />
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <RefreshCw className="w-10 h-10 text-red-500 animate-spin mb-2" />
                        <span className={`text-xs font-bold ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Cropping & Aligning page...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TEXT TO PDF (CREATE PDF) */}
              {(activeTool === 'create_pdf' || activeTool === 'import') && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Document File Name</span>
                    <input 
                      type="text" 
                      value={convTitle} 
                      onChange={e => setConvTitle(e.target.value)} 
                      className={`w-full p-2.5 rounded-xl text-xs outline-none transition-colors ${
                        themeMode === 'dark' ? 'bg-[#181818] border border-[#282828] text-white focus:border-red-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-red-500'
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Contents</span>
                    <textarea 
                      value={convText} 
                      onChange={e => setConvText(e.target.value)} 
                      rows={8} 
                      placeholder="Type rich paragraph layout blocks..."
                      className={`w-full p-2.5 rounded-xl text-xs font-mono outline-none transition-colors ${
                        themeMode === 'dark' ? 'bg-[#181818] border border-[#282828] text-white focus:border-red-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-red-500'
                      }`}
                    />
                  </div>
                  <button 
                    disabled={convLoading} 
                    onClick={compileTextToPDF}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {convLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>Compile & Save to Cloud</span>
                  </button>
                </div>
              )}

              {/* IMAGE TO PDF COVERT SYSTEM */}
              {activeTool === 'image_to_pdf' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <span className="text-xs font-bold text-red-400 block">Raster Image to Vector PDF Compiler</span>
                    <p className={`text-[11px] leading-relaxed mt-1 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Choose an image asset below to wrap inside a high-contrast container block.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Select Source Image(s)</span>
                    <label className={`block w-full p-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                      themeMode === 'dark' ? 'border-[#333333] hover:border-red-500 bg-[#181818]' : 'border-slate-300 hover:border-red-500 bg-slate-50'
                    }`}>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/jpeg, image/png, image/jpg"
                        className="hidden" 
                        onChange={async (e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const files = Array.from(e.target.files) as File[];
                            const names = files.map(f => f.name).join(', ');
                            setImageToPdfSelected(names);
                            setImageToPdfName(files[0].name.split('.')[0] + '_converted.pdf');
                            triggerNotification(`📷 Selected ${files.length} image(s)`);
                            
                            const fileReaders = files.map(file => {
                              return new Promise<{name: string, base64: string}>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  resolve({ name: file.name, base64: reader.result as string });
                                };
                                reader.readAsDataURL(file);
                              });
                            });
                            const readFiles = await Promise.all(fileReaders);
                            setImageToPdfFiles(readFiles);
                          }
                        }}
                      />
                      <FileImage className="w-6 h-6 mx-auto mb-2 text-red-400" />
                      <span className={`text-xs font-bold block ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        Tap to select images from device
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-1">JPEGs, PNGs (Multiple allowed)</span>
                    </label>
                    
                    {imageToPdfSelected && (
                      <div className={`mt-2 p-2.5 rounded-xl text-xs break-words border ${
                        themeMode === 'dark' ? 'bg-[#252525] border-[#333333] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <span className="font-bold text-red-500">Selected: </span> 
                        <span className="opacity-90">{imageToPdfSelected}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Output PDF Filename</span>
                    <input 
                      type="text" 
                      value={imageToPdfName} 
                      onChange={e => setImageToPdfName(e.target.value)} 
                      className={`w-full p-2.5 rounded-xl text-xs outline-none transition-colors ${
                        themeMode === 'dark' ? 'bg-[#181818] border border-[#282828] text-white focus:border-red-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-red-500'
                      }`}
                    />
                  </div>

                  <button
                    disabled={imageToPdfLoading}
                    onClick={runImageToPdfConvert}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {imageToPdfLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Compile Image to PDF</span>
                  </button>
                </div>
              )}

              {/* ID CARD DUAL-SIDE COMPILING SYSTEM */}
              {activeTool === 'id_card' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <span className="text-xs font-bold text-amber-400 block">Smart Dual-Side ID Card Assembly</span>
                    <p className={`text-[11px] leading-relaxed mt-1 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Assemble the Front and Back images of any certificate or license card into a neat 1-page PDF.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Front side */}
                    <button
                      onClick={() => {
                        setIdCardFrontScanned(true);
                        triggerNotification('🪪 ID Front scanned & cropped successfully!');
                      }}
                      className={`p-4 rounded-2xl border text-center relative flex flex-col items-center justify-center h-28 transition-all cursor-pointer ${
                        idCardFrontScanned 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500' 
                          : themeMode === 'dark'
                          ? 'bg-[#181818] border-[#252525] text-slate-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-amber-400 text-slate-700 shadow-sm'
                      }`}
                    >
                      {idCardFrontScanned ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-emerald-500 mb-1" />
                          <span className={`text-[10px] font-bold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Front Loaded</span>
                        </>
                      ) : (
                        <>
                          <Crop className="w-8 h-8 text-amber-400 mb-1" />
                          <span className={`text-[10px] font-bold ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Scan Card Front</span>
                          <span className="text-[8px] text-slate-500 mt-1">Simulate capture</span>
                        </>
                      )}
                    </button>

                    {/* Back side */}
                    <button
                      onClick={() => {
                        setIdCardBackScanned(true);
                        triggerNotification('🪪 ID Back scanned & encrypted successfully!');
                      }}
                      className={`p-4 rounded-2xl border text-center relative flex flex-col items-center justify-center h-28 transition-all cursor-pointer ${
                        idCardBackScanned 
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500' 
                          : themeMode === 'dark'
                          ? 'bg-[#181818] border-[#252525] text-slate-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-amber-400 text-slate-700 shadow-sm'
                      }`}
                    >
                      {idCardBackScanned ? (
                        <>
                          <CheckCircle className="w-8 h-8 text-emerald-500 mb-1" />
                          <span className={`text-[10px] font-bold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Back Loaded</span>
                        </>
                      ) : (
                        <>
                          <Sliders className="w-8 h-8 text-amber-400 mb-1" />
                          <span className={`text-[10px] font-bold ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Scan Card Back</span>
                          <span className="text-[8px] text-slate-500 mt-1">Simulate capture</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Document Name</span>
                    <input 
                      type="text" 
                      value={idCardName} 
                      onChange={e => setIdCardName(e.target.value)} 
                      className={`w-full p-2.5 rounded-xl text-xs outline-none transition-colors ${
                        themeMode === 'dark' ? 'bg-[#181818] border border-[#282828] text-white focus:border-red-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-red-500'
                      }`}
                    />
                  </div>

                  <button
                    disabled={idCardLoading}
                    onClick={runIdCardMerge}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {idCardLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                    <span>Compile Dual-Side Card PDF</span>
                  </button>
                </div>
              )}

              {/* MERGE PDF */}
              {activeTool === 'merge_files' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Merged Document Name</span>
                    <input 
                      type="text" 
                      value={mergeTitle} 
                      onChange={e => setMergeTitle(e.target.value)} 
                      className={`w-full p-2.5 rounded-xl text-xs outline-none transition-colors ${
                        themeMode === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:border-red-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-red-500'
                      }`}
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block">Select Files to Join</span>
                    {documents.map(doc => {
                      const checked = selectedMergeDocs.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => {
                            if (checked) setSelectedMergeDocs(prev => prev.filter(id => id !== doc.id));
                            else setSelectedMergeDocs(prev => [...prev, doc.id]);
                          }}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            checked 
                              ? 'bg-red-500/10 border-red-500/40 text-red-500 font-semibold' 
                              : themeMode === 'dark'
                              ? 'bg-[#181818] border-[#222222] text-slate-200'
                              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm'
                          }`}
                        >
                          <span className="text-xs font-bold">{doc.name}</span>
                          <span className={`text-[10px] ${themeMode === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{doc.pages.length} pgs</span>
                        </div>
                      );
                    })}
                  </div>
                  <button 
                    disabled={selectedMergeDocs.length < 2 || convLoading} 
                    onClick={mergeSelectedFiles}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Merge Selected ({selectedMergeDocs.length})</span>
                  </button>
                </div>
              )}

              {/* COMPRESS, EDIT TEXT, SIGN, LOCK, UNLOCK Target Selectors */}
              {['compress', 'edit_text', 'sign', 'lock_pdf', 'unlock_pdf', 'print', 'pdf_to_word', 'pdf_to_image', 'pdf_to_long_image', 'word_to_pdf', 'annotate', 'add_text', 'split'].includes(activeTool) && (
                <div className="space-y-4">
                  <p className={`text-xs ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Select which document to apply this action tool on:</p>
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          if (activeTool === 'compress') runCompressPDF(doc);
                          else if (activeTool === 'sign') setSigningDoc(doc);
                          else if (activeTool === 'edit_text' || activeTool === 'add_text') {
                            setEditorDoc(doc);
                            setEditorText(doc.pages[0]?.content || '');
                          } else if (activeTool === 'lock_pdf') setLockSetupDoc(doc);
                          else if (activeTool === 'unlock_pdf') {
                            if (doc.isLocked) runUnlockDocumentPermanently(doc);
                            else triggerNotification('This file is already unlocked.');
                          } else if (activeTool === 'print') {
                            triggerNotification('🖨️ Opening browser printing simulator...');
                            setTimeout(() => window.print(), 800);
                          } else if (activeTool === 'word_to_pdf') {
                            runWordToPdf(doc);
                          } else if (activeTool === 'pdf_to_word') {
                            runPdfToWord(doc);
                          } else if (activeTool === 'pdf_to_image') {
                            runPdfToImage(doc);
                          } else if (activeTool === 'pdf_to_long_image') {
                            runPdfToLongImage(doc);
                          } else if (activeTool === 'split') {
                            runSplitPdf(doc);
                          } else if (activeTool === 'annotate') {
                            setActiveTool(null);
                            openReader(doc);
                            setTimeout(() => {
                              const quickNote = prompt(`Attach annotation memo to page 1:`, '');
                              if (quickNote !== null) {
                                setNoteInput(quickNote);
                                setReaderNotes(prev => ({ ...prev, [`${doc.id}-1`]: quickNote }));
                                triggerNotification(`💾 Saved annotation to page 1`);
                              }
                            }, 500);
                          } else {
                            // general mock successes
                            triggerNotification(`✨ Successfully processed "${activeTool.replace(/_/g, ' ')}" on ${doc.name}!`);
                            setActiveTool(null);
                          }
                        }}
                        className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          themeMode === 'dark'
                            ? 'bg-[#181818] border-[#222222] hover:bg-[#252525] text-slate-200'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 shadow-sm'
                        }`}
                      >
                        <span className={`text-xs font-bold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{doc.name}</span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* VIEW C: ''F READERVIEW SCREEN           */}
        {/* ======================================= */}
        {currentScreen === 'reader' && selectedDoc && (
          <div className={`absolute inset-0 flex flex-col z-30 animate-fade-in select-none transition-colors duration-300 ${
            themeMode === 'dark' ? 'bg-[#121212] text-white' : 'bg-[#f8f9fa] text-slate-800'
          }`}>
            {/* 📱 Premium Top Header Action Bar (Exactly like screenshot) */}
            <div className={`px-4 py-3 border-b flex items-center justify-between transition-colors duration-300 ${
              themeMode === 'dark' ? 'bg-[#0d0d0d] border-[#1f1f1f] text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              {/* Back Arrow */}
              <button 
                id="reader-back-btn"
                onClick={() => { stopTTS(); setCurrentScreen('app'); }} 
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  themeMode === 'dark' ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Minimalist Title */}
              <div className="flex-1 min-w-0 mx-3">
                <p className={`text-[11px] font-bold truncate tracking-wide uppercase font-mono ${
                  themeMode === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {selectedDoc.name.replace('.pdf', '').replace('.docx', '').replace('.pptx', '')}
                </p>
              </div>

              {/* Right Side Icons from screenshot */}
              <div className="flex items-center gap-3">
                {/* 3. Search glass icon */}
                <button 
                  onClick={() => setShowSearchToolbar(prev => !prev)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    showSearchToolbar 
                      ? 'text-red-500 bg-red-500/10' 
                      : themeMode === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Search text"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* 4. Share node */}
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: selectedDoc.name,
                        text: `Read ${selectedDoc.name} on PDF Master Pro!`,
                        url: window.location.href,
                      }).catch(() => {});
                    } else {
                      triggerNotification(`📤 Generated shareable secure download link for ${selectedDoc.name}!`);
                    }
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    themeMode === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Share Document"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* 5. Star Bookmark */}
                <button 
                  onClick={() => toggleBookmark(selectedDoc)} 
                  className={`p-1.5 rounded-lg transition-colors ${
                    themeMode === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Bookmark Document"
                >
                  <Star className={`w-4 h-4 ${selectedDoc.isBookmarked ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                </button>

                {/* 6. More vertical */}
                <button 
                  onClick={() => setShowReaderMenuSheet(true)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    themeMode === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                  title="More Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Optional Collapsible Document Search Toolbar */}
            {showSearchToolbar && (
              <div className={`px-4 py-2.5 border-b flex gap-2 animate-fade-in ${
                themeMode === 'dark' ? 'bg-[#141414] border-[#222222]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search keywords inside document..." 
                    value={readerSearch} 
                    onChange={e => setReaderSearch(e.target.value)}
                    className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-[11px] outline-none ${
                      themeMode === 'dark' 
                        ? 'bg-[#0a0a0a] border border-[#222222] text-white placeholder-slate-600' 
                        : 'bg-white border border-slate-200 text-slate-800 placeholder-slate-400 shadow-xs'
                    }`}
                    autoFocus
                  />
                  {readerSearch && (
                    <button 
                      onClick={() => setReaderSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-700 text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${
                  themeMode === 'dark' ? 'bg-black border-[#222222]' : 'bg-white border-slate-200'
                }`}>
                  <button onClick={() => setReaderZoom(prev => Math.max(50, prev - 25))} className="text-slate-400 hover:text-red-500 font-bold px-1 text-xs cursor-pointer">-</button>
                  <span className="text-[10px] text-red-500 font-bold font-mono">{readerZoom}%</span>
                  <button onClick={() => setReaderZoom(prev => Math.min(200, prev + 25))} className="text-slate-400 hover:text-red-500 font-bold px-1 text-xs cursor-pointer">+</button>
                </div>
              </div>
            )}

            {/* 📄 Immersive Document Canvas Area */}
            <div 
              className={`flex-1 overflow-hidden relative flex flex-col items-center justify-start transition-colors duration-300 ${
                readerTheme === 'black' || readerNightMode
                  ? 'bg-[#121212]'
                  : readerTheme === 'tan'
                  ? 'bg-[#e7dbcb]'
                  : readerTheme === 'mint'
                  ? 'bg-[#d8edd9]'
                  : readerTheme === 'slate'
                  ? 'bg-[#dae5ed]'
                  : themeMode === 'dark'
                  ? 'bg-[#1c1c1c]'
                  : 'bg-[#eef1f5]'
              }`}
              style={{
                filter: `brightness(${readerBrightness}%)`
              }}
            >
              
              {/* Floating Page Indicator (Exactly like top-left 1/4 in screenshot) */}
              <div className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-black/65 text-[11px] font-bold text-white z-10 border border-white/5 shadow-md flex items-center gap-1 select-none">
                <span>{readerPage}</span>
                <span className="text-slate-400">/</span>
                <span>{selectedDoc.pages.length}</span>
              </div>

              {/* Document Pages Container */}
              <div className="w-full h-full overflow-auto flex flex-col items-center justify-start relative">
                {readerContinuous ? (
                  <div 
                    id="reader-continuous-scroll-container"
                    className={`w-full flex ${
                      readerScrollDirection === 'horizontal' 
                        ? 'flex-row overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-6 px-6 py-4 h-full items-center' 
                        : 'flex-col overflow-y-auto gap-6 py-6 px-4 items-center w-full h-full'
                    }`}
                  >
                    {selectedDoc.pages.map((page, index) => (
                      <div 
                        key={index} 
                        id={`reader-page-card-${index + 1}`}
                        className={`shadow-md rounded-xl overflow-hidden transition-all duration-300 max-w-full flex-shrink-0 ${
                          readerScrollDirection === 'horizontal' ? 'w-[calc(100vw-3rem)] h-[75vh] snap-center' : 'w-full md:w-[90%]'
                        }`}
                        style={{
                          transform: `scale(${readerZoom / 100})`,
                          transformOrigin: 'top center'
                        }}
                      >
                        <ScannedDocumentPage 
                          pageNumber={index + 1}
                          content={page.content}
                          imageBase64={page.imageBase64}
                          searchQuery={readerSearch}
                          documentName={selectedDoc.name}
                          documentId={selectedDoc.id}
                          readerTheme={readerTheme}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Single Page Mode */
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 relative">
                    <div 
                      className="shadow-lg rounded-xl overflow-hidden transition-all duration-300 max-w-full w-full max-h-[80vh] md:max-w-[90%]"
                      style={{
                        transform: `scale(${readerZoom / 100})`,
                        transformOrigin: 'center center'
                      }}
                    >
                      <ScannedDocumentPage 
                        pageNumber={readerPage}
                        content={selectedDoc.pages[readerPage - 1]?.content || ''}
                        imageBase64={selectedDoc.pages[readerPage - 1]?.imageBase64}
                        searchQuery={readerSearch}
                        documentName={selectedDoc.name}
                        documentId={selectedDoc.id}
                        readerTheme={readerTheme}
                      />
                    </div>

                    {/* Pagination Chevrons */}
                    {readerPage > 1 && (
                      <button 
                        onClick={() => setReaderPage(prev => Math.max(1, prev - 1))}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/55 hover:bg-black/75 text-white z-10 shadow-lg cursor-pointer transition-transform active:scale-95"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                    )}
                    {readerPage < selectedDoc.pages.length && (
                      <button 
                        onClick={() => setReaderPage(prev => Math.min(selectedDoc.pages.length, prev + 1))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/55 hover:bg-black/75 text-white z-10 shadow-lg cursor-pointer transition-transform active:scale-95"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Mini Notes display */}
            {noteInput && (
              <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-200 text-[10px] flex justify-between items-center select-none animate-fade-in">
                <span className="truncate">📝 <span className="font-semibold text-amber-300">Page {readerPage} Memo:</span> {noteInput}</span>
                <button 
                  onClick={() => {
                    setNoteInput('');
                    setReaderNotes(prev => ({ ...prev, [`${selectedDoc.id}-${readerPage}`]: '' }));
                  }}
                  className="text-amber-400 hover:text-amber-300 text-[10px] font-bold"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Bottom Toolbar (From screenshot) */}
            <div className={`h-[72px] border-t flex items-center justify-between select-none z-10 px-6 transition-colors duration-300 ${
              themeMode === 'dark' ? 'bg-[#1e1e1e] border-[#2c2c2c]' : 'bg-white border-slate-200'
            }`}>
              <button className={`flex flex-col items-center justify-center gap-1 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <Edit className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Edit</span>
              </button>
              <button 
                onClick={() => setShowReaderSettingsSheet(true)}
                className={`flex flex-col items-center justify-center gap-1 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'} hover:opacity-80 active:scale-95 transition-all`}
              >
                <div className="w-5 h-5 border-[1.5px] border-current rounded-full flex items-center justify-center text-[10px] font-bold">A</div>
                <span className="text-[10px] tracking-tight">Style Settings</span>
              </button>
              <button className={`flex flex-col items-center justify-center gap-1 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <PenTool className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Sign</span>
              </button>
              <button className={`flex flex-col items-center justify-center gap-1 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <FileCheck className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">Fill out</span>
              </button>
              <button className={`flex flex-col items-center justify-center gap-1 ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[10px] tracking-tight">More tools</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* PASSCODE / SECURITY LOCK PAD MODAL      */}
        {/* ======================================= */}
        {lockedDocToOpen && (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 animate-fade-in select-none">
            <div className="w-16 h-16 bg-red-500/15 border border-red-500/30'text-red-500'rounded-3xl flex items-center justify-center mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide text-center">Locked File Secure PIN</h3>
            <p className="text-[10px] text-slate-500 mt-1 mb-6 text-center">Please enter passcode to decrypt & open file</p>
            
            {/* Input display circles */}
            <div className="flex gap-4 mb-8">
              {[0, 1, 2, 3].map(idx => (
                <div key={idx} className={`w-3.5 h-3.5 rounded-full border-2 border-slate-600 transition-all ${
                  pinInput.length > idx ? 'bg-red-500 border-red-500' : 'bg-transparent'
                }`} />
              ))}
            </div>

            {/* Grid Keypad */}
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    if (pinInput.length < 4) {
                      setPinInput(prev => prev + num);
                      setPinError(false);
                    }
                  }}
                  className="w-14 h-14 bg-[#181818] hover:bg-[#252525] active:bg-[#333] border border-[#252525] rounded-full flex items-center justify-center text-lg font-black text-white transition-all cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setPinInput(prev => prev.slice(0, -1))} 
                className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-white"
              >
                Clear
              </button>
              <button 
                onClick={() => {
                  if (pinInput.length < 4) {
                    setPinInput(prev => prev + '0');
                    setPinError(false);
                  }
                }}
                className="w-14 h-14 bg-[#181818] border border-[#252525] rounded-full flex items-center justify-center text-lg font-black text-white"
              >
                0
              </button>
              <button 
                onClick={handleUnlockSubmit}
                disabled={pinInput.length < 4}
                className="w-14 h-14 text-red-500 disabled:opacity-30 font-bold text-xs"
              >
                OK
              </button>
            </div>

            <button 
              onClick={() => setLockedDocToOpen(null)} 
              className="mt-8 text-xs text-slate-500 hover:text-white"
            >
              Cancel Access Attempt
            </button>
          </div>
        )}

        {/* ======================================= */}
        {/* READER STYLE SETTINGS BOTTOM SHEET      */}
        {/* ======================================= */}
        {showReaderSettingsSheet && (
          <div className="absolute inset-0 bg-black/60 z-40 flex flex-col justify-end font-sans">
            <div className="absolute inset-0" onClick={() => setShowReaderSettingsSheet(false)} />
            <div className={`rounded-t-[32px] border-t p-6 pb-8 max-h-[500px] overflow-y-auto relative z-10 animate-slide-up space-y-6 transition-colors duration-300 ${
              themeMode === 'dark' ? 'bg-[#1c1c1e] border-[#2c2c2c] text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              {/* Pill Drag Handle */}
              <div className="w-12 h-1 bg-slate-400/30 rounded-full mx-auto mb-1" />

              {/* Title Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
                <h4 className="text-sm font-extrabold tracking-wide">Reader settings</h4>
                <button 
                  onClick={() => setShowReaderSettingsSheet(false)} 
                  className={`p-1.5 rounded-full ${themeMode === 'dark' ? 'hover:bg-[#2c2c2e]' : 'hover:bg-slate-100'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SECTION 1: Scroll direction */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-left">Scroll direction</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setReaderScrollDirection('vertical')}
                    className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                      readerScrollDirection === 'vertical'
                        ? 'bg-red-600 border-red-600 text-white shadow-md'
                        : themeMode === 'dark'
                        ? 'bg-[#252528] border-transparent text-slate-300 hover:bg-[#2d2d30]'
                        : 'bg-slate-100 border-transparent text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Vertical</span>
                  </button>
                  <button 
                    onClick={() => setReaderScrollDirection('horizontal')}
                    className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
                      readerScrollDirection === 'horizontal'
                        ? 'bg-red-600 border-red-600 text-white shadow-md'
                        : themeMode === 'dark'
                        ? 'bg-[#252528] border-transparent text-slate-300 hover:bg-[#2d2d30]'
                        : 'bg-slate-100 border-transparent text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Sliders className="w-4 h-4 rotate-90" />
                    <span>Horizontal</span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: Background color */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-left">Background color</span>
                <div className="flex justify-between items-center px-2 py-1">
                  {[
                    { id: 'white', bg: 'bg-white border-slate-300', ring: 'ring-slate-400' },
                    { id: 'mint', bg: 'bg-[#eaf6ec] border-emerald-200', ring: 'ring-emerald-400' },
                    { id: 'tan', bg: 'bg-[#f4ece1] border-amber-200', ring: 'ring-amber-400' },
                    { id: 'slate', bg: 'bg-[#ebf0f5] border-blue-200', ring: 'ring-blue-400' },
                    { id: 'black', bg: 'bg-[#121212] border-neutral-800', ring: 'ring-neutral-400' },
                  ].map((color) => {
                    const isSelected = readerTheme === color.id;
                    return (
                      <button
                        key={color.id}
                        onClick={() => {
                          setReaderTheme(color.id as any);
                          if (color.id === 'black') {
                            setReaderNightMode(true);
                          } else {
                            setReaderNightMode(false);
                          }
                        }}
                        className={`w-10 h-10 rounded-full border-2 cursor-pointer transition-all ${color.bg} ${
                          isSelected ? `ring-2 ring-offset-2 ${color.ring} scale-110` : 'hover:scale-105'
                        }`}
                        title={color.id.toUpperCase()}
                      />
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: Brightness */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Brightness</span>
                  <button 
                    onClick={() => {
                      setReaderBrightnessAuto(prev => !prev);
                      if (!readerBrightnessAuto) {
                        const hour = new Date().getHours();
                        if (hour < 6 || hour > 18) {
                          setReaderBrightness(50);
                        } else {
                          setReaderBrightness(95);
                        }
                      }
                    }}
                    className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider transition-colors border ${
                      readerBrightnessAuto 
                        ? 'bg-red-600/10 border-red-500 text-red-500' 
                        : themeMode === 'dark' ? 'bg-[#252528] border-transparent text-slate-400 hover:text-slate-300' : 'bg-slate-100 border-transparent text-slate-500 hover:text-slate-600'
                    }`}
                  >
                    Auto
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <Sun className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <input 
                    type="range" 
                    min={20} 
                    max={100} 
                    value={readerBrightness} 
                    disabled={readerBrightnessAuto}
                    onChange={(e) => setReaderBrightness(parseInt(e.target.value))}
                    className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-red-600 disabled:opacity-45`}
                  />
                  <Sun className="w-5 h-5 text-slate-500 flex-shrink-0" />
                </div>
              </div>

              {/* SECTION 4: Continuous scroll */}
              <div className="flex justify-between items-center py-2 border-t border-slate-500/10">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${themeMode === 'dark' ? 'bg-[#252528]' : 'bg-slate-100'}`}>
                    <Layers className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="text-xs font-bold">Continuous scroll</span>
                </div>
                <button
                  onClick={() => setReaderContinuous(prev => !prev)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex items-center ${
                    readerContinuous ? 'bg-red-600' : 'bg-slate-400/40'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 transform ${
                    readerContinuous ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* SECTION 5: Night mode */}
              <div className="flex justify-between items-center py-2 border-t border-slate-500/10">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${themeMode === 'dark' ? 'bg-[#252528]' : 'bg-slate-100'}`}>
                    <Moon className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="text-xs font-bold">Night mode</span>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !readerNightMode;
                    setReaderNightMode(nextVal);
                    if (nextVal) {
                      setReaderTheme('black');
                    } else {
                      setReaderTheme('white');
                    }
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex items-center ${
                    readerNightMode ? 'bg-red-600' : 'bg-slate-400/40'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 transform ${
                    readerNightMode ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* READER MORE OPTIONS BOTTOM SHEET        */}
        {/* ======================================= */}
        {showReaderMenuSheet && selectedDoc && (
          <div className="absolute inset-0 bg-black/60 z-40 flex flex-col justify-end font-sans">
            <div className="absolute inset-0" onClick={() => setShowReaderMenuSheet(false)} />
            <div className="rounded-t-[32px] p-6 pb-8 max-h-[90vh] overflow-y-auto relative z-10 animate-slide-up space-y-5 bg-[#1c1c1e] border-t border-[#2c2c2c] text-white">
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-1" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-11 h-11 bg-red-600 rounded-xl flex flex-col items-center justify-center text-white font-black text-xs shadow-md select-none">
                    <span className="leading-none text-[11px]">PDF</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs md:text-sm font-extrabold text-white line-clamp-2 leading-snug">{selectedDoc.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      {selectedDoc.created ? new Date(selectedDoc.created).toLocaleDateString() : '06/19/2026'} · {selectedDoc.size || '2.9 MB'}
                    </p>
                  </div>
                </div>
                
                {/* Star bookmark icon on right side of sheet header */}
                <button 
                  onClick={() => {
                    toggleBookmark(selectedDoc);
                    triggerNotification(selectedDoc.isBookmarked ? '⭐ Removed bookmark' : '⭐ Added bookmark!');
                  }}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700/80 active:scale-95 text-slate-300 rounded-xl transition-all ml-3"
                  title="Bookmark"
                >
                  <Star className={`w-5 h-5 ${selectedDoc.isBookmarked ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}`} />
                </button>
              </div>

              {/* Horizontal action buttons grid (4 columns) */}
              <div className="grid grid-cols-4 gap-2 pt-1 pb-3 border-b border-slate-800/60">
                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    if (navigator.share) {
                      navigator.share({
                        title: selectedDoc.name,
                        url: window.location.href
                      }).catch(() => {});
                    } else {
                      triggerNotification(`📤 Generated share link for ${selectedDoc.name}`);
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-1.5 hover:bg-slate-800/50 rounded-xl transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-200">
                    <Share2 className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-300">Share</span>
                </button>

                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    const newName = prompt("Enter new name for the document:", selectedDoc.name);
                    if (newName && newName.trim()) {
                      setDocuments(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, name: newName.trim() } : d));
                      triggerNotification(`📝 Document renamed to: ${newName.trim()}`);
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-1.5 hover:bg-slate-800/50 rounded-xl transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-200">
                    <Type className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-300">Rename</span>
                </button>

                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    triggerNotification(`ℹ️ Document details: PDF format, Size: ${selectedDoc.size || '2.9 MB'}, Pages: ${selectedDoc.pages.length}, Created: ${selectedDoc.created ? new Date(selectedDoc.created).toLocaleDateString() : '06/19/2026'}`);
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-1.5 hover:bg-slate-800/50 rounded-xl transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-200">
                    <Info className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-300">Details</span>
                </button>

                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    triggerNotification('🖨️ Initializing wireless print spooler...');
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 p-1.5 hover:bg-slate-800/50 rounded-xl transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-200">
                    <Printer className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-300">Print</span>
                </button>
              </div>

              {/* Vertical list of features */}
              <div className="space-y-1">
                {/* 1. Go to page */}
                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    setGoToPageInput(readerPage.toString());
                    setShowGoToPageDialog(true);
                  }}
                  className="w-full flex items-center gap-4 py-3 px-3 hover:bg-slate-800/40 rounded-xl transition-colors text-left text-slate-200"
                >
                  <LayoutGrid className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold">Go to page</span>
                </button>

                {/* 2. View settings */}
                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    setShowReaderSettingsSheet(true);
                  }}
                  className="w-full flex items-center gap-4 py-3 px-3 hover:bg-slate-800/40 rounded-xl transition-colors text-left text-slate-200"
                >
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold">View settings</span>
                </button>

                {/* 3. Compress PDF */}
                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    setCompressTargetDoc(selectedDoc);
                    setCompressQuality('medium');
                    setShowCompressDialog(true);
                  }}
                  className="w-full flex items-center gap-4 py-3 px-3 hover:bg-slate-800/40 rounded-xl transition-colors text-left text-slate-200"
                >
                  <Minimize className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold">Compress PDF</span>
                </button>

                {/* 4. Add Watermark */}
                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    const watermarkText = prompt("Enter watermark text:", "SECURE COPY");
                    if (watermarkText) {
                      triggerNotification(`🔒 Watermark "${watermarkText}" applied successfully to all pages.`);
                    }
                  }}
                  className="w-full flex items-center gap-4 py-3 px-3 hover:bg-slate-800/40 rounded-xl transition-colors text-left text-slate-200"
                >
                  <ShieldCheck className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold">Add Watermark</span>
                </button>

                {/* 5. PDF to Image */}
                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    triggerNotification('🖼️ Converting PDF pages into high-resolution JPG images...');
                  }}
                  className="w-full flex items-center gap-4 py-3 px-3 hover:bg-slate-800/40 rounded-xl transition-colors text-left text-slate-200"
                >
                  <FileImage className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold">PDF to Image</span>
                </button>

                {/* 6. Manage Pages */}
                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    triggerNotification('📂 Drag & drop page organizer opened.');
                  }}
                  className="w-full flex items-center gap-4 py-3 px-3 hover:bg-slate-800/40 rounded-xl transition-colors text-left text-slate-200"
                >
                  <Layers className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold">Manage Pages</span>
                </button>

                {/* 7. Merge PDF */}
                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    triggerNotification('➕ Choose another document to merge with this PDF.');
                  }}
                  className="w-full flex items-center gap-4 py-3 px-3 hover:bg-slate-800/40 rounded-xl transition-colors text-left text-slate-200"
                >
                  <Plus className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold">Merge PDF</span>
                </button>

                {/* 8. Split PDF */}
                <button 
                  onClick={() => {
                    setShowReaderMenuSheet(false);
                    triggerNotification('✂️ Select page numbers to split this PDF.');
                  }}
                  className="w-full flex items-center gap-4 py-3 px-3 hover:bg-slate-800/40 rounded-xl transition-colors text-left text-slate-200"
                >
                  <Scissors className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold">Split PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* CUSTOM GO TO PAGE BOTTOM DIALOG SHEET   */}
        {/* ======================================= */}
        {showGoToPageDialog && selectedDoc && (
          <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end font-sans">
            {/* Background overlay click to close */}
            <div className="absolute inset-0" onClick={() => setShowGoToPageDialog(false)} />
            
            {/* Dialog Container */}
            <div className="bg-[#161618] rounded-t-[32px] p-6 pb-12 w-full max-w-md mx-auto space-y-5 border-t border-[#252528] relative z-10 animate-slide-up flex flex-col items-start text-left">
              
              {/* Document with Arrow Curved Flying Icon */}
              <div className="flex items-start justify-start">
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Paper background */}
                  <path d="M14 10C14 7.79086 15.7909 6 18 6H38L50 18V54C50 56.2091 48.2091 58 46 58H18C15.7909 58 14 56.2091 14 54V10Z" fill="url(#paper_grad)" />
                  {/* Paper fold */}
                  <path d="M38 6V18H50L38 6Z" fill="#90caf9" />
                  {/* Lines on paper */}
                  <path d="M20 26H44" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  <path d="M20 34H44" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  <path d="M20 42H34" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  {/* Yellow curved Arrow flying out from under to the right */}
                  <path d="M8 38C8 26 18 14 46 16" stroke="url(#arrow_grad)" strokeWidth="4.5" strokeLinecap="round" />
                  <path d="M46 16L37 11M46 16L39 23" stroke="#ffb74d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id="paper_grad" x1="14" y1="6" x2="50" y2="58" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#42a5f5" />
                      <stop offset="100%" stopColor="#1565c0" />
                    </linearGradient>
                    <linearGradient id="arrow_grad" x1="8" y1="38" x2="46" y2="16" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ffb74d" stopOpacity="0" />
                      <stop offset="100%" stopColor="#ffa726" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Title */}
              <h3 className="text-xl font-extrabold text-white tracking-tight">Go to page</h3>

              {/* Input field */}
              <div className="w-full">
                <input
                  type="number"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={goToPageInput}
                  onChange={(e) => setGoToPageInput(e.target.value)}
                  placeholder={`Enter page number (1-${selectedDoc.pages.length})`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const pageNum = parseInt(goToPageInput);
                      if (pageNum >= 1 && pageNum <= selectedDoc.pages.length) {
                        navigateToPage(pageNum);
                        setShowGoToPageDialog(false);
                        triggerNotification(`📄 Navigated to Page ${pageNum}`);
                      } else {
                        triggerNotification(`❌ Invalid page number`);
                      }
                    }
                  }}
                  className="w-full bg-[#202023] text-white placeholder-slate-500 border border-[#2d2d31] rounded-2xl py-4 px-5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-600 transition-all shadow-inner"
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoToPageDialog(false)}
                  className="w-full bg-[#252528] hover:bg-[#2d2d31] active:scale-95 transition-all py-4 rounded-full text-xs font-black uppercase tracking-widest text-slate-300"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pageNum = parseInt(goToPageInput);
                    if (pageNum >= 1 && pageNum <= selectedDoc.pages.length) {
                      navigateToPage(pageNum);
                      setShowGoToPageDialog(false);
                      triggerNotification(`📄 Navigated to Page ${pageNum}`);
                    } else {
                      triggerNotification(`❌ Invalid page number`);
                    }
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all py-4 rounded-full text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-900/20"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* CUSTOM COMPRESS PDF BOTTOM SHEET DIALOG */}
        {/* ======================================= */}
        {showCompressDialog && compressTargetDoc && (
          <div className="absolute inset-0 bg-black/70 z-50 flex flex-col justify-end font-sans">
            {/* Background overlay click to close */}
            <div className="absolute inset-0" onClick={() => setShowCompressDialog(false)} />
            
            {/* Dialog Container */}
            <div className="bg-[#161618] rounded-t-[32px] p-6 pb-10 w-full max-w-md mx-auto space-y-6 border-t border-[#252528] relative z-10 animate-slide-up flex flex-col text-left">
              
              {/* Drag handle */}
              <div className="w-12 h-1 bg-[#444446] rounded-full mx-auto" />
              
              {/* Document metadata info card */}
              <div className="flex items-center gap-4 bg-[#202023] p-4 rounded-2xl border border-[#2c2c2f] shadow-md">
                {/* Visual Thumbnail representation matching screenshot */}
                <div className="w-12 h-16 bg-white rounded-lg border-2 border-red-500 p-1 flex-shrink-0 flex flex-col justify-between shadow-lg overflow-hidden">
                  {/* Miniature header line */}
                  <div className="w-full h-1 bg-red-100 rounded" />
                  {/* Miniature text lines simulation */}
                  <div className="space-y-1 my-1 flex-1 flex flex-col justify-center">
                    <div className="w-4/5 h-[2px] bg-slate-300 rounded" />
                    <div className="w-full h-[2px] bg-slate-200 rounded" />
                    <div className="w-2/3 h-[2px] bg-slate-200 rounded" />
                    <div className="w-3/4 h-[2px] bg-slate-300 rounded" />
                  </div>
                  {/* Miniature footer */}
                  <div className="w-1/2 h-1 bg-red-400/40 rounded self-end" />
                </div>
                
                {/* Text details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 break-all">
                    {compressTargetDoc.name}
                  </h4>
                  <p className="text-xs font-black text-[#e53935] mt-1.5 uppercase tracking-wide">
                    {compressTargetDoc.size}
                  </p>
                </div>
              </div>

              {/* Radio options container */}
              <div className="space-y-4">
                {[
                  { id: 'small', label: 'Small size', desc: 'Low quality' },
                  { id: 'medium', label: 'Medium size', desc: 'Good quality' },
                  { id: 'large', label: 'Large size', desc: 'Best quality' }
                ].map((opt) => {
                  const isSelected = compressQuality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCompressQuality(opt.id as any)}
                      className="w-full flex items-center justify-between py-3.5 px-4 rounded-2xl bg-[#202023]/60 hover:bg-[#202023] border border-[#252528] active:scale-[0.99] transition-all text-left"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{opt.label}</span>
                        <span className="text-xs text-slate-400 mt-0.5">{opt.desc}</span>
                      </div>
                      
                      {/* Beautiful Custom Radio Button circle */}
                      <div className="relative flex items-center justify-center">
                        <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                          isSelected ? 'border-red-500 bg-transparent' : 'border-[#444446]'
                        }`}>
                          {isSelected && (
                            <div className="w-3.5 h-3.5 rounded-full bg-[#e53935]" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Compress Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompressDialog(false);
                    runCompressPDF(compressTargetDoc, compressQuality);
                  }}
                  className="w-full bg-[#e53935] hover:bg-[#d32f2f] active:scale-[0.98] transition-all py-4 rounded-full text-sm font-bold tracking-wide text-white shadow-xl shadow-red-900/10 text-center"
                >
                  Compress
                </button>
              </div>
              
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* INTERACTIVE BOTTOM SHEET ACTION MENUS   */}
        {/* ======================================= */}
        {dropdownDoc && (
          <div className="absolute inset-0 bg-black/60 z-40 flex flex-col justify-end">
            <div className="absolute inset-0" onClick={() => setDropdownDoc(null)} />
            <div className="bg-[#1c1c1c] rounded-t-[32px] border-t border-[#333333] p-4 max-h-[420px] overflow-y-auto relative z-10 animate-slide-up space-y-3">
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2" />
              <div className="pb-2 border-b border-[#282828]">
                <h4 className="text-xs font-extrabold text-white line-clamp-1">{dropdownDoc.name}</h4>
                <p className="text-[10px] text-slate-500 mt-1">{dropdownDoc.size} • {dropdownDoc.pages.length} Pages</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setDropdownDoc(null); handleDocClick(dropdownDoc); }} className="p-2.5 bg-[#252525] hover:bg-[#333] rounded-xl flex items-center gap-2.5 text-xs font-bold text-left text-white">
                  <Eye className="w-4 h-4 text-red-500" />
                  <span>Open Reader</span>
                </button>
                <button 
                  onClick={() => { 
                    const docToToggle = dropdownDoc;
                    setDropdownDoc(null); 
                    toggleBookmark(docToToggle); 
                  }} 
                  className="p-2.5 bg-[#252525] hover:bg-[#333] rounded-xl flex items-center gap-2.5 text-xs font-bold text-left text-white"
                >
                  <Star className={`w-4 h-4 text-yellow-500 ${dropdownDoc.isBookmarked ? 'fill-yellow-500' : ''}`} />
                  <span>{dropdownDoc.isBookmarked ? 'Unbookmark' : 'Bookmark'}</span>
                </button>
                <button onClick={() => { setDropdownDoc(null); setSigningDoc(dropdownDoc); }} className="p-2.5 bg-[#252525] hover:bg-[#333] rounded-xl flex items-center gap-2.5 text-xs font-bold text-left text-white">
                  <PenTool className="w-4 h-4 text-emerald-500" />
                  <span>Sign File</span>
                </button>
                <button onClick={() => { setDropdownDoc(null); setLockSetupDoc(dropdownDoc); }} className="p-2.5 bg-[#252525] hover:bg-[#333] rounded-xl flex items-center gap-2.5 text-xs font-bold text-left text-white">
                  <Lock className="w-4 h-4 text-blue-500" />
                  <span>Lock with PIN</span>
                </button>
                <button onClick={() => { setDropdownDoc(null); setCompressTargetDoc(dropdownDoc); setCompressQuality('medium'); setShowCompressDialog(true); }} className="p-2.5 bg-[#252525] hover:bg-[#333] rounded-xl flex items-center gap-2.5 text-xs font-bold text-left text-white">
                  <Sliders className="w-4 h-4 text-orange-500" />
                  <span>Compress</span>
                </button>
                <button onClick={() => { setDropdownDoc(null); deleteDocument(dropdownDoc.id); }} className="p-2.5 bg-[#252525] hover:bg-red-950 text-red-300 rounded-xl flex items-center gap-2.5 text-xs font-bold text-left">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>Delete File</span>
                </button>
              </div>

              <button onClick={() => setDropdownDoc(null)} className="w-full py-2.5 bg-[#252525] hover:bg-[#333] text-white rounded-xl text-xs font-bold">
                Close Options Menu
              </button>
            </div>
          </div>
        )}

        {/* LOCK PASSWORD CONFIG POPUP */}
        {lockSetupDoc && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
            <div className="w-full max-w-xs bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-4 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-blue-400">
                <Lock className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase">Configure Lock Pin</h4>
              </div>
              <p className="text-[10px] text-slate-400">Enter a secure 4-digit security PIN passcode to lock "{lockSetupDoc.name}":</p>
              <input
                type="password"
                maxLength={4}
                placeholder="e.g. 1234"
                value={lockSetupPin}
                onChange={e => setLockSetupPin(e.target.value.replace(/\D/g, ''))}
                className="w-full p-2 bg-black border border-[#2a2a2a] rounded-xl text-xs text-center font-bold font-mono text-white tracking-widest focus:outline-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setLockSetupDoc(null)} className="flex-1 py-2 bg-[#252525] rounded-xl text-[10px] font-bold">Cancel</button>
                <button onClick={runLockDocument} disabled={lockSetupPin.length < 4} className="flex-1 py-2 bg-red-600 rounded-xl text-[10px] font-bold disabled:opacity-30">Lock File</button>
              </div>
            </div>
          </div>
        )}

        {/* SIGNATURE SETUP POPUP */}
        {signingDoc && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
            <div className="w-full max-w-xs bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-4 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-emerald-400">
                <PenTool className="w-5 h-5" />
                <h4 className="text-xs font-black uppercase">Draw E-Signature</h4>
              </div>
              <p className="text-[10px] text-slate-400">Type full legal name below to append dynamic security signature stamp:</p>
              <input
                type="text"
                placeholder="Type name (e.g. Omith Vidul)"
                value={signingName}
                onChange={e => setSigningName(e.target.value)}
                className="w-full p-2 bg-black border border-[#2a2a2a] rounded-xl text-xs text-center font-bold text-white focus:outline-none"
              />
              <div className="h-20 bg-black border border-[#252525] rounded-xl flex items-center justify-center select-none">
                <span className="font-serif italic text-lg'text-red-500'opacity-60 tracking-wider">
                  {signingName || 'E-Signature Preview'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSigningDoc(null)} className="flex-1 py-2 bg-[#252525] rounded-xl text-[10px] font-bold">Cancel</button>
                <button onClick={runSignDocument} disabled={!signingName.trim()} className="flex-1 py-2 bg-red-600 rounded-xl text-[10px] font-bold disabled:opacity-30">Apply Stamp</button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE TEXT EDITOR POPUP */}
        {editorDoc && (
          <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-4 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center text-blue-400 border-b border-[#222] pb-2">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  <h4 className="text-xs font-black uppercase">Modify Page Text</h4>
                </div>
                <span className="text-[9px] text-slate-500 truncate max-w-[120px]">{editorDoc.name}</span>
              </div>
              <textarea
                value={editorText}
                onChange={e => setEditorText(e.target.value)}
                rows={8}
                className="w-full p-2.5 bg-black border border-[#2a2a2a] rounded-xl text-xs font-mono text-slate-300 focus:outline-none resize-none leading-relaxed"
              />
              <div className="flex gap-2">
                <button onClick={() => setEditorDoc(null)} className="flex-1 py-2 bg-[#252525] rounded-xl text-[10px] font-bold">Cancel</button>
                <button onClick={runEditTextDocument} className="flex-1 py-2 bg-red-600 rounded-xl text-[10px] font-bold">Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* COMPRESSION PROCESSING POPUP */}
        {compressingDoc && (
          <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 select-none animate-fade-in">
            <Sliders className="w-12 h-12'text-red-500'animate-bounce mb-3" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">Reducing PDF Size...</h4>
            <p className="text-[10px] text-slate-500 mt-1">Recalculating metadata and vector tables for "{compressingDoc.name}"</p>
            <div className="w-32 bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {/* FAB CLICK EXPANSION MODAL */}
        {showFabMenu && (
          <div className="absolute inset-0 bg-black/80 z-40 flex flex-col justify-end">
            <div className="absolute inset-0" onClick={() => setShowFabMenu(false)} />
            <div className="bg-[#1c1c1c] rounded-t-[32px] border-t border-[#333] p-4 relative z-10 animate-slide-up space-y-3">
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2" />
              <h4 className="text-[10px] font-black'text-red-500'uppercase tracking-widest text-center">Scan / Import Asset</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => { setShowFabMenu(false); setActiveTool('scan_to_pdf'); }} className="flex flex-col items-center justify-center p-3 bg-[#252525] hover:bg-[#333] rounded-2xl text-center">
                  <Crop className="w-6 h-6 text-blue-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-300">Camera Scan</span>
                </button>
                <button onClick={() => { setShowFabMenu(false); setActiveTool('create_pdf'); }} className="flex flex-col items-center justify-center p-3 bg-[#252525] hover:bg-[#333] rounded-2xl text-center">
                  <FileDown className="w-6 h-6 text-red-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-300">Create PDF</span>
                </button>
                <button onClick={() => { setShowFabMenu(false); setActiveTool('image_to_text'); }} className="flex flex-col items-center justify-center p-3 bg-[#252525] hover:bg-[#333] rounded-2xl text-center">
                  <Sparkles className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-300">AI OCR</span>
                </button>
              </div>

              <button onClick={() => setShowFabMenu(false)} className="w-full py-2 bg-[#252525] text-slate-400 hover:text-white rounded-xl text-xs font-bold">
                Dismiss Selection
              </button>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* SECURE OVERRIDE ADMINISTRATOR PANEL      */}
        {/* ======================================= */}
        {showAdminPanel && (
          <div className="absolute inset-0 bg-[#0d0d0d] flex flex-col z-50 animate-slide-up font-sans">
            
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#222222] bg-[#141414] flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-500">
                <Lock className="w-4 h-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">Administrator Overrides</h3>
              </div>
              <button 
                onClick={saveAdminSettings} 
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save Publish
              </button>
            </div>

            {/* Tab buttons */}
            <div className="flex border-b border-[#222222] bg-[#141414] px-2 select-none">
              <button
                onClick={() => setAdminActiveTab('admob')}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  adminActiveTab === 'admob' ? 'border-red-500 text-red-500' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📢 AdMob Ads
              </button>
              <button
                onClick={() => setAdminActiveTab('navigation')}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  adminActiveTab === 'navigation' ? 'border-red-500 text-red-500' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                🧭 Menu Manager
              </button>
              <button
                onClick={() => setAdminActiveTab('pages')}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  adminActiveTab === 'pages' ? 'border-red-500 text-red-500' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📝 Page Content
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Tab 1: ''Mob Ads */}
              {adminActiveTab === 'admob' && (
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1 text-left">
                    <span className="text-[9px] font-black uppercase text-red-400 block">AdMob Management Engine</span>
                    <p className="text-[10px] text-slate-400">Real-time centralized configuration of all ad placement keys in the system. Stored dynamically in backend without hardcoded IDs.</p>
                  </div>

                  <div className="p-4 bg-[#141414] border border-[#222222] rounded-2xl space-y-3.5 text-left">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Publisher ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.publisherId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, publisherId: e.target.value } } : null)} 
                        placeholder="pub-XXXXXXXXXXXXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-red-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">App ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.appId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, appId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-red-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">App Open Ad ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.appOpenId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, appOpenId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-red-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Banner Ad ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.bannerId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, bannerId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-red-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Interstitial Ad ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.interstitialId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, interstitialId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-red-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Native Ad ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.nativeId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, nativeId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-red-500 font-mono" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: ''vigation Menu Manager */}
              {adminActiveTab === 'navigation' && (
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left">
                    <span className="text-[9px] font-black uppercase text-red-400 block">Navigation Menu Manager</span>
                    <p className="text-[10px] text-slate-400 mt-1">Control dynamic routes, menu order, active toggles, and screen icons in real-time.</p>
                  </div>

                  {/* List existing items */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block text-left select-none">Current Navigation Items</span>
                    
                    {adminNavs.sort((a, b) => a.order - b.order).map((nav, index) => {
                      return (
                        <div key={nav.id} className="p-3.5 bg-[#141414] border border-[#222222] rounded-2xl flex flex-col gap-3 text-left">
                          <div className="flex items-center justify-between gap-2 border-b border-[#222] pb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded">
                                #{nav.order}
                              </span>
                              <span className="text-xs font-extrabold text-white truncate">{nav.title}</span>
                              <span className="text-[10px] text-slate-400 truncate font-mono">({nav.route})</span>
                            </div>
                            
                            {/* Reordering Controls & Delete */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => moveNavItem(index, 'up')}
                                disabled={index === 0}
                                className={`w-6 h-6 flex items-center justify-center rounded bg-[#222] hover:bg-[#333] text-[10px] text-slate-300 disabled:opacity-30 disabled:hover:bg-[#222]`}
                                title="Move Up"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => moveNavItem(index, 'down')}
                                disabled={index === adminNavs.length - 1}
                                className={`w-6 h-6 flex items-center justify-center rounded bg-[#222] hover:bg-[#333] text-[10px] text-slate-300 disabled:opacity-30 disabled:hover:bg-[#222]`}
                                title="Move Down"
                              >
                                ▼
                              </button>
                              {/* Delete button only if not Home */}
                              {nav.route !== '/home' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNavItem(nav.id, nav.route)}
                                  className="w-6 h-6 flex items-center justify-center rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[10px] font-bold"
                                  title="Delete Menu Item"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <span className="text-[8px] text-slate-500 uppercase font-black block mb-1">Title</span>
                              <input 
                                type="text" 
                                value={nav.title} 
                                onChange={e => handleUpdateNavItem(nav.id, { title: e.target.value })} 
                                className="w-full p-2 bg-black border border-[#222] rounded-lg text-xs text-white outline-none focus:border-red-500" 
                              />
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-500 uppercase font-black block mb-1">Route</span>
                              <input 
                                type="text" 
                                value={nav.route} 
                                disabled={nav.route === '/home'}
                                onChange={e => handleUpdateNavItem(nav.id, { route: e.target.value })} 
                                className="w-full p-2 bg-black border border-[#222] rounded-lg text-xs text-white outline-none focus:border-red-500 disabled:opacity-40" 
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] text-slate-500 uppercase font-black">Icon:</span>
                              <select 
                                value={nav.icon} 
                                onChange={e => handleUpdateNavItem(nav.id, { icon: e.target.value })}
                                className="p-1 bg-black border border-[#222] rounded text-[10px] text-slate-300 outline-none focus:border-red-500"
                              >
                                <option value="FileText">FileText (Doc)</option>
                                <option value="Info">Info (About)</option>
                                <option value="PhoneCall">PhoneCall (Contact)</option>
                                <option value="ShieldAlert">ShieldAlert (Privacy)</option>
                                <option value="BookOpen">BookOpen (Terms)</option>
                                <option value="Globe">Globe</option>
                                <option value="HelpCircle">Help</option>
                                <option value="Heart">Heart</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] text-slate-500 uppercase font-black">Enabled:</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateNavItem(nav.id, { enabled: !nav.enabled })}
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-colors ${
                                  nav.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-transparent'
                                }`}
                              >
                                {nav.enabled ? 'Enabled' : 'Disabled'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Form to add a new navigation item */}
                  <div className="p-4 bg-[#141414] border border-[#222222] rounded-2xl text-left space-y-3">
                    <span className="text-[10px] font-extrabold uppercase text-red-500 block">➕ Add New Menu Route</span>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[8px] text-slate-500 uppercase font-black block mb-1">Title</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Help Center" 
                          value={newNavTitle} 
                          onChange={e => setNewNavTitle(e.target.value)} 
                          className="w-full p-2 bg-black border border-[#222] rounded-lg text-xs text-white outline-none focus:border-red-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-500 uppercase font-black block mb-1">Route Path</label>
                        <input 
                          type="text" 
                          placeholder="e.g. /help" 
                          value={newNavRoute} 
                          onChange={e => setNewNavRoute(e.target.value)} 
                          className="w-full p-2 bg-black border border-[#222] rounded-lg text-xs text-white font-mono outline-none focus:border-red-500" 
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 select-none">
                      <div className="flex items-center gap-2">
                        <label className="text-[8px] text-slate-500 uppercase font-black">Icon:</label>
                        <select 
                          value={newNavIcon} 
                          onChange={e => setNewNavIcon(e.target.value)}
                          className="p-1 bg-black border border-[#222] rounded text-xs text-slate-300 outline-none focus:border-red-500"
                        >
                          <option value="FileText">FileText (Doc)</option>
                          <option value="Info">Info (About)</option>
                          <option value="PhoneCall">PhoneCall (Contact)</option>
                          <option value="ShieldAlert">ShieldAlert (Privacy)</option>
                          <option value="BookOpen">BookOpen (Terms)</option>
                          <option value="Globe">Globe</option>
                          <option value="HelpCircle">Help</option>
                          <option value="Heart">Heart</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddNavItem}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: ''ge Content Manager */}
              {adminActiveTab === 'pages' && (
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-left">
                    <span className="text-[9px] font-black uppercase text-red-400 block">Page Content Manager</span>
                    <p className="text-[10px] text-slate-400 mt-1">Directly edit the Markdown template content associated with each custom menu route screen.</p>
                  </div>

                  <div className="p-4 bg-[#141414] border border-[#222222] rounded-2xl text-left space-y-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Select Page to Edit</label>
                      <select 
                        value={selectedAdminPageKey} 
                        onChange={e => setSelectedAdminPageKey(e.target.value)}
                        className="w-full p-2.5 bg-black border border-[#222] rounded-xl text-xs text-white outline-none focus:border-red-500"
                      >
                        {Object.keys(adminPages).map((key) => (
                          <option key={key} value={key}>
                            {key.toUpperCase()} Page Screen
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1.5 flex justify-between items-center select-none">
                        <span>Markdown Content</span>
                        <span className="text-[8px] font-mono text-slate-500 font-normal">config.pages.{selectedAdminPageKey}</span>
                      </label>
                      <textarea 
                        value={adminPages[selectedAdminPageKey] || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setAdminPages(prev => ({
                            ...prev,
                            [selectedAdminPageKey]: val
                          }));
                          if (selectedAdminPageKey === 'about') setAdminPageAbout(val);
                          if (selectedAdminPageKey === 'contact') setAdminPageContact(val);
                          if (selectedAdminPageKey === 'privacy') setAdminPagePrivacy(val);
                          if (selectedAdminPageKey === 'terms') setAdminPageTerms(val);
                        }} 
                        rows={12} 
                        placeholder={`# Enter markdown content for ${selectedAdminPageKey}...`}
                        className="w-full p-3 bg-black border border-[#222] rounded-xl text-xs font-mono text-slate-300 outline-none focus:border-red-500" 
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            <button 
              onClick={() => setShowAdminPanel(false)} 
              className="m-4 py-2 bg-[#252525] hover:bg-[#333] text-xs font-bold rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              Close Override Dashboard
            </button>
          </div>
        )}

        {/* ======================================= */}
        {/* PREMIUM INTERACTIVE SETTINGS MODAL INTERFACES */}
        {/* ======================================= */}

        {/* 1. File Manager Modal */}
        {showFileManagerModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${
              themeMode === 'dark' ? 'bg-[#1a1a1e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-red-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-bold">Local File Storage</span>
                </div>
                <button onClick={() => setShowFileManagerModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-2xl ${themeMode === 'dark' ? 'bg-black/30' : 'bg-slate-50'}`}>
                    <span className="text-[10px] text-slate-400 block font-medium">Cached Documents</span>
                    <span className="text-lg font-black mt-0.5 block text-red-500">14 Files</span>
                  </div>
                  <div className={`p-3 rounded-2xl ${themeMode === 'dark' ? 'bg-black/30' : 'bg-slate-50'}`}>
                    <span className="text-[10px] text-slate-400 block font-medium">Database Sync</span>
                    <span className="text-xs font-black mt-1.5 block text-emerald-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-2xl ${themeMode === 'dark' ? 'bg-black/30' : 'bg-slate-50'} space-y-2`}>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Device space allocated:</span>
                    <span className="font-bold">48.2 MB / 100 MB</span>
                  </div>
                  <div className="w-full h-2 bg-slate-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full" style={{ width: '88.2%' }} />
                  </div>
                </div>

                <button
                  onClick={() => {
                    triggerNotification('🧹 Local storage cache cleared safely! 0 bytes remaining.');
                    setShowFileManagerModal(false);
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Cache & Temp PDFs</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Scan Settings Modal */}
        {showScanSettingsModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${
              themeMode === 'dark' ? 'bg-[#1a1a1e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-red-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-bold">Scan Quality & Presets</span>
                </div>
                <button onClick={() => setShowScanSettingsModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-2">Scan DPI Resolution</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-500/10 rounded-xl">
                    {['Low (150 DPI)', 'Medium (300)', 'High (600)'].map((dpi) => (
                       <button
                         key={dpi}
                         onClick={() => {
                           triggerNotification(`🖨️ DPI preset changed to: ${dpi}`);
                         }}
                         className="py-1.5 text-[10px] font-bold rounded-lg text-center bg-red-600 text-white cursor-pointer hover:bg-red-500 transition-colors"
                       >
                         {dpi.split(' ')[0]}
                       </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-2">Filter Profile</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-500/10 rounded-xl">
                    {['B&W Document', 'Full Color', 'Grayscale'].map((prof) => (
                       <button
                         key={prof}
                         onClick={() => {
                           triggerNotification(`🎨 Scan filter set to: ${prof}`);
                         }}
                         className="py-1.5 text-[10px] font-bold rounded-lg text-center bg-red-600 text-white cursor-pointer hover:bg-red-500 transition-colors"
                       >
                         {prof.split(' ')[0]}
                       </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Auto-Crop Scan Margins</span>
                    <div className="w-9 h-5 bg-emerald-600 rounded-full p-0.5 flex items-center justify-end cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full shadow" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Document Anti-Glare Filter</span>
                    <div className="w-9 h-5 bg-emerald-600 rounded-full p-0.5 flex items-center justify-end cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full shadow" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    triggerNotification('💾 Custom scan presets saved successfully!');
                    setShowScanSettingsModal(false);
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Preset Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Add Widget Modal */}
        {showWidgetModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${
              themeMode === 'dark' ? 'bg-[#1a1a1e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-red-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Grid className="w-5 h-5 text-teal-500" />
                  <span className="text-sm font-bold">Simulated Launcher Widget</span>
                </div>
                <button onClick={() => setShowWidgetModal(false)} className="text-slate-400 hover'text-red-500'cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="space-y-4 text-center">
                <p className="text-[11px] text-slate-400">
                  Place this customizable premium launcher widget on your device's home screen for rapid scans and single-tap document conversions.
                </p>

                {/* Simulated Device Homescreen Widget */}
                <div className="p-4 bg-gradient-to-br from-indigo-900 to-red-950 rounded-2xl border border-slate-700/60 shadow-lg text-left relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-red-500/10 rounded-full blur-xl" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <img src={appLogo} alt="Logo" className="w-5.5 h-5.5 rounded-lg object-contain bg-white p-0.5" />
                      <span className="text-[10px] font-black text-white tracking-tight">PDF MASTER</span>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 bg-red-500/20 text-red-300 font-extrabold uppercase rounded-full tracking-wider">Quick Actions</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="p-2 bg-black/40 rounded-lg flex items-center justify-between text-[9px] hover:bg-black/60 transition-colors">
                      <span className="text-white/90 font-medium">📄 Scan Work Invoice</span>
                      <span className="text-slate-400 text-[8px]">2m ago</span>
                    </div>
                    <div className="p-2 bg-black/40 rounded-lg flex items-center justify-between text-[9px] hover:bg-black/60 transition-colors">
                      <span className="text-white/90 font-medium">✍️ Contract_Signed.pdf</span>
                      <span className="text-slate-400 text-[8px]">1h ago</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    triggerNotification('📱 Premium Quick-Action Widget placed successfully on device home screen!');
                    setShowWidgetModal(false);
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Add Widget to Home Screen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Request Features / Feedback Modal */}
        {showFeedbackModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${
              themeMode === 'dark' ? 'bg-[#1a1a1e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-red-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-bold">Request Features / Feedback</span>
                </div>
                <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover'text-red-500'cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="space-y-3.5">
                <p className="text-[11px] text-slate-400 leading-normal">
                  Your requests go directly to our engineering server queue. We routinely push updates based on user ideas!
                </p>

                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Describe the utility, tools, or integrations you would love to have (e.g. Google Drive sync, batch crop, automatic Excel conversion)..."
                  rows={4}
                  className={`w-full p-3 rounded-xl text-xs font-medium focus:ring-1 focus:ring-red-500 outline-none border transition-all ${
                    themeMode === 'dark' ? 'bg-black/40 border-slate-800 text-slate-200 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />

                <button
                  onClick={() => {
                    if (!feedbackMessage.trim()) {
                      triggerNotification('⚠️ Please type your request or suggestion first!');
                      return;
                    }
                    triggerNotification('🚀 Feature request dispatched directly to developer build server!');
                    setFeedbackMessage('');
                    setShowFeedbackModal(false);
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Feature Request</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. FAQ Accordion Modal */}
        {showFaqModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border flex flex-col max-h-[85%] ${
              themeMode === 'dark' ? 'bg-[#1a1a1e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-red-500/10 mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-bold">Frequently Asked Questions</span>
                </div>
                <button onClick={() => setShowFaqModal(false)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 text-left scrollbar-thin">
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-red-500">🔒 Is PDF Master Pro fully offline?</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Yes! All conversions, page extraction, signatures, crop overlays, and passcode lockers occur entirely locally on-device. No data gets sent off your smartphone.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-red-500">💡 How do I reset a locked PIN?</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Toggle on the recovery "Security question" under Settings. If you ever enter an incorrect passcode, you can answer the question to safely bypass and unlock files.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-red-500">📑 How can I merge or crop multiple documents?</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Navigate to the "Tools" directory tab on your Home library, tap the specific layout utility, select your files, and customize parameters before downloading.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-red-500">🤖 Does this app include optical text recognition (OCR)?</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Absolutely. The built-in AI scanner has full Gemini engine pipeline support to instantly parse text paragraphs directly from uploaded or camera-scanned documents.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/10 flex-shrink-0">
                <button
                  onClick={() => setShowFaqModal(false)}
                  className="w-full py-2 bg-slate-500/10 hover:bg-slate-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Done, Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Rate Us Modal */}
        {showRatingModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${
              themeMode === 'dark' ? 'bg-[#1a1a1e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-red-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                  <span className="text-sm font-bold">Rate PDF Master Pro</span>
                </div>
                <button onClick={() => setShowRatingModal(false)} className="text-slate-400 hover'text-red-500'cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="space-y-4 text-center">
                <p className="text-[11px] text-slate-400 leading-normal">
                  Enjoying PDF Master Pro? Tap your stars to rate your offline conversion and scanner experience!
                </p>

                {/* Animated Stars Grid */}
                <div className="flex justify-center gap-2 py-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatingValue(star)}
                      className="transition-transform active:scale-125 cursor-pointer"
                    >
                      <Star className={`w-7.5 h-7.5 transition-all ${
                        ratingValue >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-500'
                      }`} />
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="Write a quick word (optional)..."
                  className={`w-full p-2.5 rounded-xl text-xs font-medium focus:ring-1 focus:ring-red-500 outline-none border transition-all ${
                    themeMode === 'dark' ? 'bg-black/40 border-slate-800 text-slate-200 placeholder-slate-700' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />

                <button
                  onClick={() => {
                    triggerNotification(`⭐ Thanks for rating us ${ratingValue} stars! Your review was recorded.`);
                    setRatingFeedback('');
                    setShowRatingModal(false);
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Submit Rating
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. Setup Security Question Modal */}
        {showSecurityQuestionSetupModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${
              themeMode === 'dark' ? 'bg-[#1a1a1e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-red-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-500" />
                  <span className="text-sm font-bold">Configure Password Recovery</span>
                </div>
                <button
                  onClick={() => {
                    setShowSecurityQuestionSetupModal(false);
                    setSecurityQuestion(false);
                    localStorage.setItem('security_question', 'false');
                  }}
                  className="text-slate-400 hover'text-red-500'cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="space-y-4 text-left">
                <p className="text-[11px] text-slate-400 leading-normal">
                  Choose a security question to recover passcode locked files if you ever forget your master decryption PIN.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Select recovery question:</label>
                  <select
                    value={securityQuestionText}
                    onChange={(e) => setSecurityQuestionText(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-medium focus:ring-1 focus:ring-red-500 outline-none border transition-all ${
                      themeMode === 'dark' ? 'bg-[#25252a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="What was your first school's name?">What was your first school's name?</option>
                    <option value="What city were you born in?">What city were you born in?</option>
                    <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                    <option value="What is your childhood pet's name?">What is your childhood pet's name?</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">Your Secret Answer:</label>
                  <input
                    type="text"
                    value={securityAnswerText}
                    onChange={(e) => setSecurityAnswerText(e.target.value)}
                    placeholder="Enter recovery answer..."
                    className={`w-full p-2.5 rounded-xl text-xs font-medium focus:ring-1 focus:ring-red-500 outline-none border transition-all ${
                      themeMode === 'dark' ? 'bg-black/40 border-slate-800 text-slate-200 placeholder-slate-700' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                  />
                </div>

                <button
                  onClick={() => {
                    if (!securityAnswerText.trim()) {
                      triggerNotification('⚠️ Please enter an answer to configure recovery!');
                      return;
                    }
                    setSecurityQuestion(true);
                    localStorage.setItem('security_question', 'true');
                    localStorage.setItem('security_question_text', securityQuestionText);
                    localStorage.setItem('security_answer_text', securityAnswerText);
                    triggerNotification('🔒 Recovery security question saved and active!');
                    setShowSecurityQuestionSetupModal(false);
                  }}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Enable Recovery Protection
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Simple Icon fallback custom wrapper for Lucide Clock
function ClockIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// Simple Icon fallback custom wrapper for Lucide Camera
function Camera(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
