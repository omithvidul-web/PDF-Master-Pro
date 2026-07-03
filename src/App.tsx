import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Folder, Search, Menu, Settings, Info, PhoneCall, ShieldAlert, BookOpen,
  Sparkles, Plus, Trash2, Edit, Bookmark, Star, Volume2, VolumeX, ArrowLeft, ChevronRight,
  ArrowLeftRight, FileDown, X, Lock, Unlock, Settings2, Save, Moon, Sun, Cpu, Layers, Eye, Share2,
  CheckCircle, RefreshCw, Sliders, Download, Maximize, Minimize, Compass, ExternalLink, Play, Pause,
  Printer, PenTool, FileSpreadsheet, MoreVertical, Calendar, Crop, Grid, FileImage, Check, RotateCcw,
  Send, Bell, Globe, HelpCircle, Heart
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
  pages: { pageNumber: number; content: string }[];
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
      triggerNotification(updated.isBookmarked ? '⭐ Added to Bookmarks.' : '☆ Removed from Bookmarks.');
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
            size: '2.5 MB',
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
  const runCompressPDF = async (doc: PDFDocument) => {
    setCompressingDoc(doc);
    setTimeout(async () => {
      const updated = {
        ...doc,
        size: doc.size.includes('KB') 
          ? `${Math.max(10, Math.round(parseFloat(doc.size) * 0.6))} KB`
          : `${Math.max(0.2, parseFloat((parseFloat(doc.size) * 0.5).toFixed(1)))} MB`
      };
      
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: updated })
      });
      const data = await res.json();
      setDocuments(data.documents);
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
            size: '412 KB',
            pages: [
              {
                pageNumber: 1,
                content: `=== IMAGE CONVERTED TO PDF ===\nSource Image File: ${imageToPdfSelected}\nGenerated Date: ${new Date().toLocaleDateString()}\n\n[Raster Image Data Compiled successfully inside standard PDF page container. Coordinates, colors, and EXIF attributes preserved.]`
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
            size: '520 KB',
            pages: [
              {
                pageNumber: 1,
                content: `=== MERGED DUAL-SIDE ID CARD SCAN ===\nDocument ID Name: ${idCardName}\n\n=========================================\n[ FRONT SIDE - NATIONAL IDENTITY CARD ]\nHolder Photo & Hologram Verified.\nSerial: ID-88294-A2\n=========================================\n\n=========================================\n[ BACK SIDE - CODES & CHIP DETAILS ]\nMagnetic Strip Hash Code: 0x94EF29CA\nIssuer: Government Authority Dept\n=========================================\n\n[🛡️ SECURITY WATERMARK: PDF MASTER PRO ORIGINAL SECURE ID SCAN]`
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
            size: '650 KB',
            pages: doc.pages.map(p => ({
              pageNumber: p.pageNumber,
              content: `=== CONVERTED FROM WORD (.docx) ===\n${p.content}`
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
            pages: doc.pages.map(p => ({
              pageNumber: p.pageNumber,
              content: `=== Microsoft Word Document (.docx) ===\n[Reflowed Layout from PDF Source]\n\n${p.content}`
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
            size: '350 KB',
            pages: [
              {
                pageNumber: 1,
                content: `=== PNG IMAGE RASTER (Page 1) ===\nSource PDF: ${doc.name}\n\n[All text and layouts successfully rasterized into lossless pixel grid at 300 DPI resolution.]`
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
                content: `=== STITCHED LONG VERTICAL IMAGE ===\nSource PDF: ${doc.name}\n\n[Merged ${doc.pages.length} pages vertically into a seamless single JPEG image map for web presentation and offline backup.]`
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
                  content: `=== SPLIT PAGE ${pageNum} OF ${doc.pages.length} ===\nSource File: ${doc.name}\n\n${doc.pages[i].content}`
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

    return list;
  };

  // Helper file format checkers
  const getFormatDetails = (doc: PDFDocument) => {
    const name = doc.name.toLowerCase();
    if (name.endsWith('.pdf')) return { label: 'PDF', bg: 'bg-rose-500/15 text-rose-500 border border-rose-500/30' };
    if (name.endsWith('.csv') || name.endsWith('.xlsx')) return { label: 'CSV', bg: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' };
    if (name.endsWith('.docx') || doc.isWord) return { label: 'Word', bg: 'bg-blue-500/15 text-blue-500 border border-blue-500/30' };
    if (name.endsWith('.pptx') || doc.isPPT) return { label: 'PPT', bg: 'bg-amber-500/15 text-amber-500 border border-amber-500/30' };
    return { label: 'FILE', bg: 'bg-slate-500/15 text-slate-400 border border-slate-500/30' };
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
        
        {/* Android Status Bar Notch */}
        <div className={`px-6 pt-3 pb-1 text-xs font-semibold flex items-center justify-between select-none z-30 transition-colors duration-300 ${
          themeMode === 'dark' ? 'bg-[#0d0d0d] text-slate-400' : 'bg-slate-100 text-slate-500'
        }`}>
          <div className="flex items-center gap-1">
            <span>13:07</span>
            <span className="text-[10px] px-1 bg-rose-500/20 text-rose-300 rounded">5G</span>
          </div>
          
          <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-500/60 rounded-full animate-pulse" />
          </div>
          
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-mono text-[10px]">100%</span>
          </div>
        </div>



        {/* ======================================= */}
        {/* SCREEN: SPLASH SCREEN                   */}
        {/* ======================================= */}
        {currentScreen === 'splash' && (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d0d] p-6 z-40">
            <div className="relative w-40 h-40 flex items-center justify-center mb-6 select-none">
              {/* Outer soft glowing halo */}
              <div className="absolute inset-2 bg-rose-500/10 rounded-3xl blur-xl animate-pulse" />
              
              {/* Image Logo with styled frame */}
              <div className="relative w-36 h-36 bg-white rounded-[32px] p-2 shadow-2xl border-2 border-rose-200 z-10 overflow-hidden flex items-center justify-center ring-4 ring-rose-50/50 animate-bounce-slow">
                <img 
                  src={appLogo} 
                  alt="PDF Master Pro Logo" 
                  className="w-full h-full object-contain rounded-[24px]" 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Dynamic rotating outer compass ring */}
              <div className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '14s' }}>
                <svg viewBox="0 0 100 100" className="w-full h-full text-rose-500/25 opacity-80">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 6" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-black text-white tracking-widest text-center uppercase">
              PDF MASTER <span className="text-rose-500">PRO</span>
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
            <div className={`px-4 pt-4 pb-3 flex items-center justify-between border-b transition-colors duration-300 ${
              themeMode === 'dark' ? 'bg-[#121212] border-[#222222]' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowDrawer(true)} 
                  className={`p-1.5 rounded-xl transition-all ${
                    themeMode === 'dark' ? 'hover:bg-[#252525] text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Open Menu"
                >
                  <Menu className="w-5 h-5 text-rose-500" />
                </button>
                <span className={`text-base font-black tracking-tight ${
                  themeMode === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  PDF <span className="text-rose-500 font-black">Master Pro</span>
                </span>
              </div>
              
              <div className="flex items-center gap-2.5 text-slate-400">
                {/* Instant Theme Switch Toggle */}
                <button 
                  onClick={toggleTheme}
                  className={`p-1.5 rounded-xl transition-all ${
                    themeMode === 'dark' ? 'hover:bg-[#252525] text-amber-400' : 'hover:bg-slate-100 text-indigo-600'
                  }`}
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
                <button 
                  onClick={() => {
                    if (searchFocused || searchQuery) {
                      setSearchFocused(false);
                      setSearchQuery('');
                    } else {
                      setSearchFocused(true);
                    }
                  }} 
                  className={themeMode === 'dark' ? 'hover:text-white text-slate-300' : 'hover:text-slate-950 text-slate-600'}
                  title="Search documents"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => triggerNotification('🔄 Auto sorted by upload date.')} 
                  className={themeMode === 'dark' ? 'hover:text-white' : 'hover:text-slate-950'}
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Search overlay */}
            {(searchFocused || searchQuery) && (
              <div className={`p-3 border-b animate-slide-in transition-colors duration-300 ${
                themeMode === 'dark' ? 'bg-[#181818] border-[#222222]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="relative animate-fade-in">
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
                        setSearchFocused(false);
                      }
                    }}
                    className={`w-full pl-9 pr-8 py-1.5 rounded-xl text-xs transition-all focus:outline-none ${
                      themeMode === 'dark' 
                        ? 'bg-[#2a2a2a] border border-[#333333] text-white placeholder-slate-500' 
                        : 'bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 shadow-sm'
                    }`}
                    autoFocus
                  />
                  <button 
                    onClick={() => {
                      if (searchQuery) {
                        setSearchQuery('');
                      } else {
                        setSearchFocused(false);
                      }
                    }} 
                    className="absolute right-3 top-2.5"
                    title="Clear query or close search"
                  >
                    <X className={`w-3.5 h-3.5 ${
                      themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* VIEW A & B: HOME SCREEN CONTENT          */}
            {/* ======================================= */}
            {activePage === 'home' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab !== 'tools' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* 2. Scrollable Category horizontal bar */}
                    <div className={`flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto border-b scrollbar-none select-none transition-colors duration-300 ${
                      themeMode === 'dark' ? 'bg-[#121212] border-[#1c1c1c]' : 'bg-white border-slate-100'
                    }`}>
                      {(['All', 'PDF', 'Word', 'Excel', 'PPT'] as const).map(cat => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`relative px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                            activeCategory === cat 
                              ? themeMode === 'dark' ? 'bg-[#252525] text-white border border-[#333333]' : 'bg-slate-100 text-rose-600 border border-slate-300 shadow-sm' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {cat}
                          {activeCategory === cat && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* 3. Recently Added Banner Folder */}
                    <div className={`mx-4 mt-3 p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      themeMode === 'dark' ? 'bg-[#1c1c1c] border-[#2a2a2a] hover:bg-[#252525]' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                    }`}
                         onClick={() => triggerNotification('📁 Showing 60 recently updated cloud assets.')}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-600/10 border border-yellow-500/20 flex items-center justify-center">
                          <Folder className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        </div>
                        <div>
                          <span className={`text-xs font-bold block ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Recently added</span>
                          <span className="text-[10px] text-slate-400">Automatic local indexing</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-rose-500 text-white font-extrabold text-[9px] rounded-full">+60</span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>

                    {/* 4. Files Scroll List Container */}
                    <div className="flex-1 px-4 py-3 overflow-y-auto space-y-2.5">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                          {activeTab === 'recent' ? 'Recently Opened' : activeTab === 'bookmarks' ? 'Bookmarks' : 'File Cabinet'}
                        </span>
                        <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold">
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
                            <div className="w-18 h-18 rounded-2xl bg-white border-2 border-rose-100 flex items-center justify-center p-1 shadow-md overflow-hidden ring-4 ring-rose-50/50">
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
                            <button onClick={() => triggerNotification('👑 Pro unlocked successfully!')} className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[9px] rounded-lg">PRO</button>
                          </div>
                        </div>
                      )}

                      {/* Documents Loop list */}
                      {getSortedDocs(documents).map((doc) => {
                        const format = getFormatDetails(doc);
                        return (
                          <div
                            key={doc.id}
                            onClick={() => handleDocClick(doc)}
                            className={`p-3 border rounded-2xl flex items-center justify-between transition-all cursor-pointer group ${
                              themeMode === 'dark' 
                                ? 'bg-[#181818] hover:bg-[#222222] border-[#222222] hover:border-[#2f2f2f]' 
                                : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* File Icon format box */}
                              <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-extrabold text-[10px] shadow-lg ${format.bg}`}>
                                {doc.isLocked ? (
                                  <Lock className="w-5 h-5 text-slate-400 animate-pulse" />
                                ) : (
                                  <span>{format.label}</span>
                                )}
                              </div>
                              <div className="min-w-0 max-w-[210px]">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <h4 className={`text-xs font-bold truncate group-hover:text-rose-500 transition-colors ${
                                    themeMode === 'dark' ? 'text-slate-100' : 'text-slate-800'
                                  }`}>
                                    {doc.name}
                                  </h4>
                                  {doc.isBookmarked && (
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                  <span>{new Date(doc.created).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>{doc.size}</span>
                                </div>
                              </div>
                            </div>

                            {/* Dropdown sheet option click */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownDoc(doc);
                              }}
                              className={`p-2 rounded-lg transition-colors ${
                                themeMode === 'dark' ? 'hover:bg-[#2b2b2b] text-slate-400 hover:text-white' : 'hover:bg-slate-150 text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Empty state */}
                      {getSortedDocs(documents).length === 0 && (
                        <div className="py-16 text-center text-slate-500">
                          <FileText className="w-12 h-12 mx-auto stroke-1 opacity-40 mb-3" />
                          <p className="text-xs">No matching files found.</p>
                          <button 
                            onClick={() => fetchSystemData()}
                            className="mt-3 text-xs text-rose-400 hover:underline font-bold"
                          >
                            Reset Repository Seed
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 5. Floating Action Button (FAB) */}
                    <button
                      onClick={() => setShowFabMenu(true)}
                      className="absolute bottom-20 right-6 w-14 h-14 bg-rose-600 hover:bg-rose-500 rounded-full flex items-center justify-center text-white shadow-2xl transition-all cursor-pointer hover:scale-105 z-20"
                    >
                      <Plus className="w-7 h-7 stroke-[3px]" />
                    </button>
                  </div>
                )}

                {/* ======================================= */}
                {/* VIEW B: TOOLS GRID SCREEN                */}
                {/* ======================================= */}
                {activeTab === 'tools' && (
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    
                    {/* Section A: Convert */}
                    <div className="space-y-3">
                      <h3 className={`text-sm font-extrabold tracking-wide border-l-2 border-rose-500 pl-2 ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Convert</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'image_to_pdf', title: 'Image to PDF', color: 'bg-rose-500/10 text-rose-500', icon: FileImage },
                          { id: 'scan_to_pdf', title: 'Scan to PDF', color: 'bg-blue-500/10 text-blue-500', icon: Crop },
                          { id: 'id_card', title: 'ID card', color: 'bg-amber-500/10 text-amber-500', icon: Sliders },
                          { id: 'word_to_pdf', title: 'Word to PDF', color: 'bg-indigo-500/10 text-indigo-500', icon: BookOpen },
                          { id: 'pdf_to_word', title: 'PDF to Word', color: 'bg-purple-500/10 text-purple-500', icon: Layers },
                          { id: 'pdf_to_image', title: 'PDF to Image', color: 'bg-rose-500/10 text-rose-500', icon: FileImage },
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
                            {tool.hasAd && (
                              <div className="absolute top-1 right-1 bg-emerald-500 text-slate-950 font-bold text-[6px] px-1 rounded uppercase">AD</div>
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

                    {/* Section B: Edit */}
                    <div className="space-y-3">
                      <h3 className={`text-sm font-extrabold tracking-wide border-l-2 border-rose-500 pl-2 ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Edit</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'edit_text', title: 'Edit Text', color: 'bg-blue-500/10 text-blue-500', icon: Edit },
                          { id: 'annotate', title: 'Annotate', color: 'bg-purple-500/10 text-purple-500', icon: PenTool },
                          { id: 'sign', title: 'Sign', color: 'bg-emerald-500/10 text-emerald-500', icon: ShieldAlert },
                          { id: 'merge_files', title: 'Merge PDF', color: 'bg-amber-500/10 text-amber-500', icon: ArrowLeftRight },
                          { id: 'split', title: 'Split PDF', color: 'bg-rose-500/10 text-rose-500', icon: FileDown },
                          { id: 'compress', title: 'Compress PDF', color: 'bg-emerald-500/10 text-emerald-500', icon: Sliders },
                          { id: 'add_text', title: 'Add Text', color: 'bg-blue-500/10 text-blue-500', icon: Edit }
                        ].map(tool => (
                          <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center min-h-[90px] ${
                              themeMode === 'dark' ? 'bg-[#1a1a1a] border-[#252525] hover:bg-[#252525]' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
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

                    {/* Section C: Manage */}
                    <div className="space-y-3">
                      <h3 className={`text-sm font-extrabold tracking-wide border-l-2 border-rose-500 pl-2 ${themeMode === 'dark' ? 'text-white' : 'text-slate-800'}`}>Manage</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'import', title: 'Import files', color: 'bg-blue-500/10 text-blue-500', icon: Folder },
                          { id: 'create_pdf', title: 'Create PDF', color: 'bg-rose-500/10 text-rose-500', icon: FileDown },
                          { id: 'print', title: 'Print PDF', color: 'bg-amber-500/10 text-amber-500', icon: Printer },
                          { id: 'lock_pdf', title: 'Lock PDF', color: 'bg-blue-500/10 text-blue-500', icon: Lock },
                          { id: 'unlock_pdf', title: 'Unlock PDF', color: 'bg-emerald-500/10 text-emerald-500', icon: Unlock }
                        ].map(tool => (
                          <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center min-h-[90px] ${
                              themeMode === 'dark' ? 'bg-[#1a1a1a] border-[#252525] hover:bg-[#252525]' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                            }`}
                          >
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
            {/* VIEW C: SETTINGS AND THEME TOGGLE VIEW */}
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
                    <ArrowLeft className="w-5 h-5 text-rose-500" />
                    <span className="text-base font-black tracking-tight">Settings</span>
                  </button>
                </div>

                {/* GROUP 1: FILE SYSTEM & DEVICE CONFIGS */}
                <div className={`rounded-2xl overflow-hidden border shadow-sm ${
                  themeMode === 'dark' ? 'bg-[#1c1c1e] border-slate-800/80' : 'bg-white border-slate-200'
                } divide-y ${themeMode === 'dark' ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                  {/* Item 1: File manager */}
                  <button
                    onClick={() => setShowFileManagerModal(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      themeMode === 'dark' ? 'hover:bg-[#25252a] active:bg-[#2f2f36]' : 'hover:bg-slate-50 active:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-4.5 h-4.5 text-rose-500" />
                      <span className={`text-[13px] font-semibold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>File manager</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>

                  {/* Item 2: Keep screen on */}
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
                        triggerNotification(nextVal ? '💡 Screen timeout disabled. Keep screen on active.' : '📱 Screen timeout restored to system defaults.');
                      }}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 relative flex items-center ${
                        keepScreenOn ? 'bg-rose-600' : 'bg-slate-600'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        keepScreenOn ? 'translate-x-4.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Item 3: Scan settings */}
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

                  {/* Item 4: Share app */}
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
                        securityQuestion ? 'bg-rose-600' : 'bg-slate-600'
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
                                ? 'bg-rose-500/15 text-rose-500 font-bold' 
                                : themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt}</span>
                            {themeSetting === opt && <Check className="w-3.5 h-3.5 text-rose-500" />}
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
                                ? 'bg-rose-500/15 text-rose-500 font-bold' 
                                : themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt}</span>
                            {language === opt && <Check className="w-3.5 h-3.5 text-rose-500" />}
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
                                ? 'bg-rose-500/15 text-rose-500 font-bold' 
                                : themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <span>{opt}</span>
                            {defaultReader === opt && <Check className="w-3.5 h-3.5 text-rose-500" />}
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
                        triggerNotification(nextVal ? '🔔 Push notifications enabled.' : '🔕 Push notifications muted.');
                      }}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 relative flex items-center ${
                        notifications ? 'bg-rose-600' : 'bg-slate-600'
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
                  <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">Version: 1.9.9C</span>
                </div>
              </div>
            )}

            {/* ======================================= */}
            {/* VIEW D: DYNAMIC MARKDOWN CONTENT PAGES  */}
            {/* ======================================= */}
            {activePage !== 'home' && activePage !== 'settings' && (
              <div className={`flex-1 overflow-y-auto p-5 space-y-5 transition-colors duration-300 ${
                themeMode === 'dark' ? 'bg-[#121212] text-white' : 'bg-white text-slate-800'
              }`}>
                {/* Header title */}
                <div className="flex items-center gap-3 pb-3 border-b border-rose-500/10">
                  <FileText className="w-5 h-5 text-rose-500" />
                  <h3 className={`text-sm font-black uppercase tracking-wider capitalize ${themeMode === 'dark' ? 'text-white' : 'text-slate-950'}`}>
                    {activePage.replace(/_/g, ' ')}
                  </h3>
                </div>

                {/* Big Premium Brand Logo Banner inside dynamic page */}
                <div className={`p-4 rounded-3xl border flex items-center gap-4 ${
                  themeMode === 'dark' ? 'bg-[#181818] border-[#222222]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-24 h-24 bg-white rounded-3xl border-2 border-rose-200 flex items-center justify-center p-1.5 shadow-xl overflow-hidden ring-4 ring-rose-50/50">
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
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Submit Support Request</span>
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
                      className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl"
                    >
                      Submit SLA Ticket
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setActivePage('home')}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
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
                      <div className="relative w-20 h-20 bg-white rounded-[24px] border-2 border-rose-200 shadow-lg flex items-center justify-center p-1.5 overflow-hidden ring-4 ring-rose-50/50 flex-shrink-0">
                        <img 
                          src={appLogo} 
                          alt="PDF Master Pro" 
                          className="w-full h-full object-contain rounded-[16px]" 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                      <div>
                        <h3 className={`text-sm font-black tracking-tight ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>PDF Master Pro</h3>
                        <span className="text-[10px] text-rose-500 font-extrabold tracking-widest uppercase">Premium Suite</span>
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
                          ? 'bg-rose-500 text-white shadow-lg'
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
                              ? 'bg-rose-500 text-white shadow-lg'
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
                          ? 'bg-rose-500 text-white shadow-lg'
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
                { id: 'all_files', label: 'All files', icon: Folder },
                { id: 'recent', label: 'Recent', icon: ClockIcon },
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
                      isActive ? 'text-rose-500 font-extrabold' : 'text-slate-500 hover:text-slate-300'
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
                      <span className={`text-xs ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Target: <strong className="text-rose-500">{ocrDocName}</strong></span>
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
                    className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
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
                        <div className="absolute inset-4 border border-rose-500/40 rounded-xl" />
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-rose-500/60 animate-bounce" />
                        <Camera className="w-12 h-12 text-slate-600 mb-2 animate-pulse" />
                        <span className="text-[10px] text-slate-500">Position document inside grid</span>
                        <button onClick={triggerCameraCapture} className="absolute bottom-6 w-12 h-12 bg-rose-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg cursor-pointer" />
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <RefreshCw className="w-10 h-10 text-rose-500 animate-spin mb-2" />
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
                        themeMode === 'dark' ? 'bg-[#181818] border border-[#282828] text-white focus:border-rose-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-rose-500'
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
                        themeMode === 'dark' ? 'bg-[#181818] border border-[#282828] text-white focus:border-rose-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-rose-500'
                      }`}
                    />
                  </div>
                  <button 
                    disabled={convLoading} 
                    onClick={compileTextToPDF}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {convLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>Compile & Save to Cloud</span>
                  </button>
                </div>
              )}

              {/* IMAGE TO PDF COVERT SYSTEM */}
              {activeTool === 'image_to_pdf' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                    <span className="text-xs font-bold text-rose-400 block">Raster Image to Vector PDF Compiler</span>
                    <p className={`text-[11px] leading-relaxed mt-1 ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Choose an image asset below to wrap inside a high-contrast container block.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Select Source Image</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'scanned_receipt.jpg', title: 'Receipt' },
                        { id: 'driving_license.png', title: 'Driver ID' },
                        { id: 'handwritten_memo.jpg', title: 'Memo' }
                      ].map(img => {
                        const isSel = imageToPdfSelected === img.id;
                        return (
                          <button
                            key={img.id}
                            onClick={() => {
                              setImageToPdfSelected(img.id);
                              triggerNotification(`📷 Selected image source: ${img.title}`);
                            }}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              isSel 
                                ? 'bg-rose-600/25 border-rose-500 text-rose-500 font-bold' 
                                : themeMode === 'dark'
                                ? 'bg-[#181818] border-[#252525] text-slate-400 hover:text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-rose-400'
                            }`}
                          >
                            <FileImage className="w-5 h-5 mx-auto mb-1 text-rose-400" />
                            <span className="text-[10px] font-bold block">{img.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Output PDF Filename</span>
                    <input 
                      type="text" 
                      value={imageToPdfName} 
                      onChange={e => setImageToPdfName(e.target.value)} 
                      className={`w-full p-2.5 rounded-xl text-xs outline-none transition-colors ${
                        themeMode === 'dark' ? 'bg-[#181818] border border-[#282828] text-white focus:border-rose-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-rose-500'
                      }`}
                    />
                  </div>

                  <button
                    disabled={imageToPdfLoading}
                    onClick={runImageToPdfConvert}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
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
                        themeMode === 'dark' ? 'bg-[#181818] border border-[#282828] text-white focus:border-rose-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-rose-500'
                      }`}
                    />
                  </div>

                  <button
                    disabled={idCardLoading}
                    onClick={runIdCardMerge}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
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
                        themeMode === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:border-rose-500' : 'bg-white border border-slate-200 text-slate-800 focus:border-rose-500'
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
                              ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 font-semibold' 
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
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
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
        {/* VIEW C: PDF READERVIEW SCREEN           */}
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
                {/* 1. Droplet (Fluid brightness / Contrast mode) */}
                <button 
                  onClick={() => {
                    const nextTint = readerPaperTint === 'white' ? 'sepia' : readerPaperTint === 'sepia' ? 'dark' : 'white';
                    setReaderPaperTint(nextTint);
                    triggerNotification(`🎨 Set page paper contrast tint: ${nextTint.toUpperCase()}`);
                  }}
                  className={`p-1.5 rounded-lg transition-colors relative ${
                    themeMode === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  } ${readerPaperTint !== 'white' ? 'text-amber-500' : ''}`}
                  title="Page Paper Color Tint"
                >
                  <Droplet className="w-4 h-4" />
                </button>

                {/* 2. 'W' word reflow icon */}
                <button 
                  onClick={() => {
                    const nextZoom = readerZoom === 100 ? 125 : readerZoom === 125 ? 150 : 100;
                    setReaderZoom(nextZoom);
                    triggerNotification(`🔍 Text reflow adjusted: ${nextZoom}% scale`);
                  }}
                  className={`p-1.5 transition-colors font-bold font-serif text-xs border w-6 h-6 flex items-center justify-center rounded-md ${
                    themeMode === 'dark' 
                      ? 'hover:bg-slate-800 text-slate-300 border-slate-700 bg-slate-900' 
                      : 'hover:bg-slate-100 text-slate-700 border-slate-300 bg-slate-100'
                  }`}
                  title="Reflow Mode"
                >
                  W
                </button>

                {/* 3. Search glass icon */}
                <button 
                  onClick={() => setShowSearchToolbar(prev => !prev)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    showSearchToolbar 
                      ? 'text-rose-500 bg-rose-500/10' 
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
                  <Star className={`w-4 h-4 ${selectedDoc.isBookmarked ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </button>

                {/* 6. More vertical */}
                <div className="relative group">
                  <button className={`p-1.5 rounded-lg transition-colors ${
                    themeMode === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                  }`}>
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  <div className={`absolute right-0 top-8 w-40 border rounded-xl shadow-2xl py-1 z-50 hidden group-hover:block text-[10px] ${
                    themeMode === 'dark' ? 'bg-[#161616] border-[#2a2a2a]' : 'bg-white border-slate-200'
                  }`}>
                    <button 
                      onClick={() => {
                        if (readerTTSActive) stopTTS();
                        else startTTS(selectedDoc.pages[readerPage - 1]?.content);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                        themeMode === 'dark' ? 'hover:bg-[#252525] text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>{readerTTSActive ? 'Stop Voice Reader' : 'Read Page Aloud'}</span>
                    </button>
                    <button 
                      onClick={() => triggerNotification('🖨️ Initializing wireless print spooler...')}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                        themeMode === 'dark' ? 'hover:bg-[#252525] text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-400" />
                      <span>Print Document</span>
                    </button>
                    <button 
                      onClick={() => triggerNotification('📥 Document saved to offline storage.')}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                        themeMode === 'dark' ? 'hover:bg-[#252525] text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download Copy</span>
                    </button>
                  </div>
                </div>
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
                  <button onClick={() => setReaderZoom(prev => Math.max(50, prev - 25))} className="text-slate-400 hover:text-rose-500 font-bold px-1 text-xs cursor-pointer">-</button>
                  <span className="text-[10px] text-rose-500 font-bold font-mono">{readerZoom}%</span>
                  <button onClick={() => setReaderZoom(prev => Math.min(200, prev + 25))} className="text-slate-400 hover:text-rose-500 font-bold px-1 text-xs cursor-pointer">+</button>
                </div>
              </div>
            )}

            {/* 📄 Immersive Document Canvas Area */}
            <div className={`flex-1 overflow-auto p-4 flex flex-col items-center justify-start relative transition-colors duration-300 ${
              themeMode === 'dark' ? 'bg-[#1c1c1c]' : 'bg-[#eef1f5]'
            }`}>
              
              {/* Floating Translucent Page Indicator (Exactly like top-left 1/4 in screenshot) */}
              <div className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-black/65 text-[11px] font-bold text-white z-10 border border-white/5 shadow-md flex items-center gap-1 select-none">
                <span>{readerPage}</span>
                <span className="text-slate-400">/</span>
                <span>{selectedDoc.pages.length}</span>
              </div>

              {/* Dynamic Contrast Tint Layering wrapper */}
              <div 
                className="w-full max-w-sm rounded-xl shadow-2xl relative transition-all duration-300"
                style={{ 
                  transform: `scale(${readerZoom / 100})`, 
                  transformOrigin: 'top center',
                  filter: readerPaperTint === 'sepia' 
                    ? 'sepia(0.35) contrast(0.95) brightness(0.95)' 
                    : readerPaperTint === 'dark' 
                    ? 'invert(0.9) hue-rotate(180deg)' 
                    : 'none'
                }}
              >
                {/* Embedded Scanned Document Page */}
                {selectedDoc.pages[readerPage - 1] ? (
                  <ScannedDocumentPage 
                    pageNumber={readerPage}
                    content={selectedDoc.pages[readerPage - 1].content}
                    searchQuery={readerSearch}
                    documentName={selectedDoc.name}
                    documentId={selectedDoc.id}
                  />
                ) : (
                  <div className="w-full bg-white text-slate-800 p-8 rounded-xl border border-slate-200 min-h-[400px] flex items-center justify-center">
                    <p className="text-slate-400 text-center text-xs">No page content found.</p>
                  </div>
                )}
              </div>

              {/* Floating Action Button (FAB) (Pencil Edit from screenshot bottom-right) */}
              <button 
                onClick={() => {
                  const quickNote = prompt(`Attach annotation memo to page ${readerPage}:`, noteInput || '');
                  if (quickNote !== null) {
                    setNoteInput(quickNote);
                    setReaderNotes(prev => ({ ...prev, [`${selectedDoc.id}-${readerPage}`]: quickNote }));
                    triggerNotification(`💾 Saved annotation to page ${readerPage}`);
                  }
                }}
                className="absolute bottom-28 right-5 w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95 z-20"
                title="Annotate Page"
              >
                <Edit className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Collapsible Mini Notes display */}
            {noteInput && (
              <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-200 text-[10px] flex justify-between items-center select-none animate-fade-in">
                <span className="truncate">📝 <span className="font-semibold text-amber-300">Page {readerPage} Memo:</span> {noteInput}</span>
                <button 
                  onClick={() => {
                    setNoteInput('');
                    setReaderNotes(prev => ({ ...prev, [`${selectedDoc.id}-${readerPage}`]: '' }));
                    triggerNotification('🗑️ Removed page memo');
                  }}
                  className="text-amber-400 hover:text-amber-200 font-bold px-1 ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* 🎞️ Bottom Thumbnail Navigation Grid (Filmstrip from screenshot) */}
            <div className="bg-[#181818] border-t border-[#252525] p-3 flex flex-col gap-2">
              <span className="text-[9px] font-black tracking-wider text-slate-500 uppercase select-none px-1">
                Document Pages Thumbnail filmstrip
              </span>
              <div className="flex gap-3 overflow-x-auto pb-1 px-1 scrollbar-thin">
                {selectedDoc.pages.map((page, idx) => {
                  const pNum = page.pageNumber;
                  const isActive = readerPage === pNum;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setReaderPage(pNum);
                        setNoteInput(readerNotes[`${selectedDoc.id}-${pNum}`] || '');
                      }}
                      className={`relative flex-shrink-0 w-20 h-24 bg-white rounded-lg overflow-hidden transition-all text-left ${
                        isActive 
                          ? 'border-[3px] border-rose-500 scale-[1.03] shadow-md shadow-rose-950/20' 
                          : 'border border-slate-700 opacity-60 hover:opacity-100 hover:scale-[1.02]'
                      }`}
                    >
                      {/* Paper Thumbnail Miniature Simulation */}
                      <div className="absolute inset-0 p-1.5 flex flex-col justify-between pointer-events-none select-none">
                        {/* Page header lines */}
                        <div className="space-y-1">
                          <div className="h-1 bg-slate-400 w-3/4 rounded-full" />
                          <div className="h-0.5 bg-slate-300 w-1/2 rounded-full" />
                          <div className="h-0.5 bg-slate-300 w-5/6 rounded-full" />
                        </div>
                        {/* Stamp indicator box simulation */}
                        <div className="flex justify-between items-end">
                          <div className="space-y-0.5">
                            <div className="h-0.5 bg-slate-300 w-8 rounded-full" />
                            <div className="h-0.5 bg-slate-300 w-6 rounded-full" />
                          </div>
                          {pNum === 4 && (
                            <div className="w-4 h-4 rounded-full border border-blue-600/30 rotate-12 flex items-center justify-center text-[3px] text-blue-600 bg-blue-100/10">
                              ★
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Small Red/Gray top-left Page Badge (Exactly like screenshot) */}
                      <span className={`absolute top-1 left-1 px-1 py-0.5 text-[8px] font-bold rounded-sm ${
                        isActive ? 'bg-rose-600 text-white' : 'bg-slate-700/80 text-slate-200'
                      }`}>
                        {pNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 🎫 Bottom Sponsors Native Banner Ad (High Fidelity Binance Replica from screenshot) */}
            <div className="bg-[#101011] border-t border-slate-800 p-3 flex items-center justify-between select-none relative">
              <div className="flex items-center gap-3">
                
                {/* High Fidelity Interlocking Yellow Diamonds Binance Logo */}
                <div className="w-9 h-9 bg-[#f3ba2f] rounded-lg flex items-center justify-center shadow-md relative">
                  <div className="absolute rotate-45 w-4 h-4 bg-slate-900 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#f3ba2f]" />
                  </div>
                  <div className="absolute rotate-45 border-[1.5px] border-slate-900 w-6 h-6" />
                </div>

                {/* Ad Details */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white tracking-wide">Binance</span>
                    <span className="text-[8px] font-bold px-1 py-0.2 bg-slate-800 text-slate-400 border border-slate-700 rounded-sm scale-90">
                      Ad
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                    買比特幣，就用全球第一投資理財首選加密貨幣交易所！
                  </p>
                </div>
              </div>

              {/* Right Button CTA */}
              <div className="flex items-center gap-2">
                <a 
                  href="https://binance.com" 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={() => triggerNotification('🚀 Redirecting safely to verified official partner Binance...')}
                  className="px-3.5 py-1.5 bg-white hover:bg-[#f3ba2f] active:bg-[#db9d13] text-black text-[10px] font-black rounded-full transition-all flex items-center gap-1 shadow-sm shrink-0"
                >
                  <span>立即註冊</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>

                {/* Subtle Close buttons */}
                <button 
                  onClick={(e) => {
                    e.currentTarget.parentElement?.parentElement?.remove();
                    triggerNotification('Ad banner successfully hidden.');
                  }}
                  className="text-slate-600 hover:text-slate-400 p-1 rounded"
                >
                  ✕
                </button>
              </div>
              
              {/* Info icon */}
              <span className="absolute bottom-1 left-1 text-[7px] text-slate-700">i</span>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* PASSCODE / SECURITY LOCK PAD MODAL      */}
        {/* ======================================= */}
        {lockedDocToOpen && (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 animate-fade-in select-none">
            <div className="w-16 h-16 bg-rose-500/15 border border-rose-500/30 text-rose-500 rounded-3xl flex items-center justify-center mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide text-center">Locked File Secure PIN</h3>
            <p className="text-[10px] text-slate-500 mt-1 mb-6 text-center">Please enter passcode to decrypt & open file</p>
            
            {/* Input display circles */}
            <div className="flex gap-4 mb-8">
              {[0, 1, 2, 3].map(idx => (
                <div key={idx} className={`w-3.5 h-3.5 rounded-full border-2 border-slate-600 transition-all ${
                  pinInput.length > idx ? 'bg-rose-500 border-rose-500' : 'bg-transparent'
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
                className="w-14 h-14 text-rose-500 disabled:opacity-30 font-bold text-xs"
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
                  <Eye className="w-4 h-4 text-rose-500" />
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
                <button onClick={() => { setDropdownDoc(null); runCompressPDF(dropdownDoc); }} className="p-2.5 bg-[#252525] hover:bg-[#333] rounded-xl flex items-center gap-2.5 text-xs font-bold text-left text-white">
                  <Sliders className="w-4 h-4 text-orange-500" />
                  <span>Compress</span>
                </button>
                <button onClick={() => { setDropdownDoc(null); deleteDocument(dropdownDoc.id); }} className="p-2.5 bg-[#252525] hover:bg-rose-950 text-rose-300 rounded-xl flex items-center gap-2.5 text-xs font-bold text-left">
                  <Trash2 className="w-4 h-4 text-rose-500" />
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
                <button onClick={runLockDocument} disabled={lockSetupPin.length < 4} className="flex-1 py-2 bg-rose-600 rounded-xl text-[10px] font-bold disabled:opacity-30">Lock File</button>
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
                <span className="font-serif italic text-lg text-rose-500 opacity-60 tracking-wider">
                  {signingName || 'E-Signature Preview'}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSigningDoc(null)} className="flex-1 py-2 bg-[#252525] rounded-xl text-[10px] font-bold">Cancel</button>
                <button onClick={runSignDocument} disabled={!signingName.trim()} className="flex-1 py-2 bg-rose-600 rounded-xl text-[10px] font-bold disabled:opacity-30">Apply Stamp</button>
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
                <button onClick={runEditTextDocument} className="flex-1 py-2 bg-rose-600 rounded-xl text-[10px] font-bold">Save Changes</button>
              </div>
            </div>
          </div>
        )}

        {/* COMPRESSION PROCESSING POPUP */}
        {compressingDoc && (
          <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6 select-none animate-fade-in">
            <Sliders className="w-12 h-12 text-rose-500 animate-bounce mb-3" />
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">Reducing PDF Size...</h4>
            <p className="text-[10px] text-slate-500 mt-1">Recalculating metadata and vector tables for "{compressingDoc.name}"</p>
            <div className="w-32 bg-slate-800 h-1 mt-4 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}

        {/* FAB CLICK EXPANSION MODAL */}
        {showFabMenu && (
          <div className="absolute inset-0 bg-black/80 z-40 flex flex-col justify-end">
            <div className="absolute inset-0" onClick={() => setShowFabMenu(false)} />
            <div className="bg-[#1c1c1c] rounded-t-[32px] border-t border-[#333] p-4 relative z-10 animate-slide-up space-y-3">
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2" />
              <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center">Scan / Import Asset</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => { setShowFabMenu(false); setActiveTool('scan_to_pdf'); }} className="flex flex-col items-center justify-center p-3 bg-[#252525] hover:bg-[#333] rounded-2xl text-center">
                  <Crop className="w-6 h-6 text-blue-400 mb-1" />
                  <span className="text-[9px] font-bold text-slate-300">Camera Scan</span>
                </button>
                <button onClick={() => { setShowFabMenu(false); setActiveTool('create_pdf'); }} className="flex flex-col items-center justify-center p-3 bg-[#252525] hover:bg-[#333] rounded-2xl text-center">
                  <FileDown className="w-6 h-6 text-rose-400 mb-1" />
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
              <div className="flex items-center gap-2 text-rose-500">
                <Lock className="w-4 h-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">Administrator Overrides</h3>
              </div>
              <button 
                onClick={saveAdminSettings} 
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save Publish
              </button>
            </div>

            {/* Tab buttons */}
            <div className="flex border-b border-[#222222] bg-[#141414] px-2 select-none">
              <button
                onClick={() => setAdminActiveTab('admob')}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  adminActiveTab === 'admob' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📢 AdMob Ads
              </button>
              <button
                onClick={() => setAdminActiveTab('navigation')}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  adminActiveTab === 'navigation' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                🧭 Menu Manager
              </button>
              <button
                onClick={() => setAdminActiveTab('pages')}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                  adminActiveTab === 'pages' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                📝 Page Content
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Tab 1: AdMob Ads */}
              {adminActiveTab === 'admob' && (
                <div className="space-y-4">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-left">
                    <span className="text-[9px] font-black uppercase text-rose-400 block">AdMob Management Engine</span>
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
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-rose-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">App ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.appId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, appId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-rose-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">App Open Ad ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.appOpenId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, appOpenId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-rose-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Banner Ad ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.bannerId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, bannerId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-rose-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Interstitial Ad ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.interstitialId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, interstitialId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-rose-500 font-mono" 
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Native Ad ID</label>
                      <input 
                        type="text" 
                        value={config?.admob?.nativeId || ''} 
                        onChange={e => setConfig(prev => prev ? { ...prev, admob: { ...prev.admob, nativeId: e.target.value } } : null)} 
                        placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX" 
                        className="w-full p-2.5 bg-black border border-[#222222] rounded-xl text-xs text-white outline-none focus:border-rose-500 font-mono" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Navigation Menu Manager */}
              {adminActiveTab === 'navigation' && (
                <div className="space-y-4">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-left">
                    <span className="text-[9px] font-black uppercase text-rose-400 block">Navigation Menu Manager</span>
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
                              <span className="text-[10px] font-mono text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
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
                                  className="w-6 h-6 flex items-center justify-center rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-[10px] font-bold"
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
                                className="w-full p-2 bg-black border border-[#222] rounded-lg text-xs text-white outline-none focus:border-rose-500" 
                              />
                            </div>
                            <div>
                              <span className="text-[8px] text-slate-500 uppercase font-black block mb-1">Route</span>
                              <input 
                                type="text" 
                                value={nav.route} 
                                disabled={nav.route === '/home'}
                                onChange={e => handleUpdateNavItem(nav.id, { route: e.target.value })} 
                                className="w-full p-2 bg-black border border-[#222] rounded-lg text-xs text-white outline-none focus:border-rose-500 disabled:opacity-40" 
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] text-slate-500 uppercase font-black">Icon:</span>
                              <select 
                                value={nav.icon} 
                                onChange={e => handleUpdateNavItem(nav.id, { icon: e.target.value })}
                                className="p-1 bg-black border border-[#222] rounded text-[10px] text-slate-300 outline-none focus:border-rose-500"
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
                    <span className="text-[10px] font-extrabold uppercase text-rose-500 block">➕ Add New Menu Route</span>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[8px] text-slate-500 uppercase font-black block mb-1">Title</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Help Center" 
                          value={newNavTitle} 
                          onChange={e => setNewNavTitle(e.target.value)} 
                          className="w-full p-2 bg-black border border-[#222] rounded-lg text-xs text-white outline-none focus:border-rose-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-500 uppercase font-black block mb-1">Route Path</label>
                        <input 
                          type="text" 
                          placeholder="e.g. /help" 
                          value={newNavRoute} 
                          onChange={e => setNewNavRoute(e.target.value)} 
                          className="w-full p-2 bg-black border border-[#222] rounded-lg text-xs text-white font-mono outline-none focus:border-rose-500" 
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 select-none">
                      <div className="flex items-center gap-2">
                        <label className="text-[8px] text-slate-500 uppercase font-black">Icon:</label>
                        <select 
                          value={newNavIcon} 
                          onChange={e => setNewNavIcon(e.target.value)}
                          className="p-1 bg-black border border-[#222] rounded text-xs text-slate-300 outline-none focus:border-rose-500"
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
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Page Content Manager */}
              {adminActiveTab === 'pages' && (
                <div className="space-y-4">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-left">
                    <span className="text-[9px] font-black uppercase text-rose-400 block">Page Content Manager</span>
                    <p className="text-[10px] text-slate-400 mt-1">Directly edit the Markdown template content associated with each custom menu route screen.</p>
                  </div>

                  <div className="p-4 bg-[#141414] border border-[#222222] rounded-2xl text-left space-y-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Select Page to Edit</label>
                      <select 
                        value={selectedAdminPageKey} 
                        onChange={e => setSelectedAdminPageKey(e.target.value)}
                        className="w-full p-2.5 bg-black border border-[#222] rounded-xl text-xs text-white outline-none focus:border-rose-500"
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
                        className="w-full p-3 bg-black border border-[#222] rounded-xl text-xs font-mono text-slate-300 outline-none focus:border-rose-500" 
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
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-rose-500" />
                  <span className="text-sm font-bold">Local File Storage</span>
                </div>
                <button onClick={() => setShowFileManagerModal(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-2xl ${themeMode === 'dark' ? 'bg-black/30' : 'bg-slate-50'}`}>
                    <span className="text-[10px] text-slate-400 block font-medium">Cached Documents</span>
                    <span className="text-lg font-black mt-0.5 block text-rose-500">14 Files</span>
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
                    <div className="h-full bg-rose-600 rounded-full" style={{ width: '48.2%' }} />
                  </div>
                </div>

                <button
                  onClick={() => {
                    triggerNotification('🧹 Local storage cache cleared safely! 0 bytes remaining.');
                    setShowFileManagerModal(false);
                  }}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
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
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-bold">Scan Quality & Presets</span>
                </div>
                <button onClick={() => setShowScanSettingsModal(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
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
                        className="py-1.5 text-[10px] font-bold rounded-lg text-center bg-rose-600 text-white cursor-pointer hover:bg-rose-500 transition-colors"
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
                        className="py-1.5 text-[10px] font-bold rounded-lg text-center bg-rose-600 text-white cursor-pointer hover:bg-rose-500 transition-colors"
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
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
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
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Grid className="w-5 h-5 text-teal-500" />
                  <span className="text-sm font-bold">Simulated Launcher Widget</span>
                </div>
                <button onClick={() => setShowWidgetModal(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="space-y-4 text-center">
                <p className="text-[11px] text-slate-400">
                  Place this customizable premium launcher widget on your device's home screen for rapid scans and single-tap document conversions.
                </p>

                {/* Simulated Device Homescreen Widget */}
                <div className="p-4 bg-gradient-to-br from-indigo-900 to-rose-950 rounded-2xl border border-slate-700/60 shadow-lg text-left relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-500/10 rounded-full blur-xl" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <img src={appLogo} alt="Logo" className="w-5.5 h-5.5 rounded-lg object-contain bg-white p-0.5" />
                      <span className="text-[10px] font-black text-white tracking-tight">PDF MASTER</span>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 bg-rose-500/20 text-rose-300 font-extrabold uppercase rounded-full tracking-wider">Quick Actions</span>
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
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
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
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-bold">Request Features / Feedback</span>
                </div>
                <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
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
                  className={`w-full p-3 rounded-xl text-xs font-medium focus:ring-1 focus:ring-rose-500 outline-none border transition-all ${
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
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/10 mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-indigo-400" />
                  <span className="text-sm font-bold">Frequently Asked Questions</span>
                </div>
                <button onClick={() => setShowFaqModal(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 text-left scrollbar-thin">
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-rose-500">🔒 Is PDF Master Pro fully offline?</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Yes! All conversions, page extraction, signatures, crop overlays, and passcode lockers occur entirely locally on-device. No data gets sent off your smartphone.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-rose-500">💡 How do I reset a locked PIN?</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Toggle on the recovery "Security question" under Settings. If you ever enter an incorrect passcode, you can answer the question to safely bypass and unlock files.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-rose-500">📑 How can I merge or crop multiple documents?</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Navigate to the "Tools" directory tab on your Home library, tap the specific layout utility, select your files, and customize parameters before downloading.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-rose-500">🤖 Does this app include optical text recognition (OCR)?</h4>
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
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/10 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                  <span className="text-sm font-bold">Rate PDF Master Pro</span>
                </div>
                <button onClick={() => setShowRatingModal(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer">
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
                  className={`w-full p-2.5 rounded-xl text-xs font-medium focus:ring-1 focus:ring-rose-500 outline-none border transition-all ${
                    themeMode === 'dark' ? 'bg-black/40 border-slate-800 text-slate-200 placeholder-slate-700' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />

                <button
                  onClick={() => {
                    triggerNotification(`⭐ Thanks for rating us ${ratingValue} stars! Your review was recorded.`);
                    setRatingFeedback('');
                    setShowRatingModal(false);
                  }}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
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
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/10 mb-4">
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
                  className="text-slate-400 hover:text-rose-500 cursor-pointer"
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
                    className={`w-full p-2.5 rounded-xl text-xs font-medium focus:ring-1 focus:ring-rose-500 outline-none border transition-all ${
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
                    className={`w-full p-2.5 rounded-xl text-xs font-medium focus:ring-1 focus:ring-rose-500 outline-none border transition-all ${
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
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
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
