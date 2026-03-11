import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect, useRef, useState, useCallback } from 'react';

const PRESET_COLORS = [
  { color: '#000000', label: '黒' },
  { color: '#dc2626', label: '赤' },
  { color: '#ea580c', label: 'オレンジ' },
  { color: '#ca8a04', label: '黄' },
  { color: '#16a34a', label: '緑' },
  { color: '#2563eb', label: '青' },
  { color: '#7c3aed', label: '紫' },
  { color: '#6b7280', label: 'グレー' },
];

const IMAGE_SIZES = [
  { label: '小', width: '200px' },
  { label: '中', width: '400px' },
  { label: '大', width: '600px' },
  { label: '元', width: '100%' },
];

/* ── Link Insert Modal ── */
function LinkModal({ open, initialUrl, onInsert, onCancel }) {
  const [url, setUrl] = useState(initialUrl || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, initialUrl]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (url.trim()) onInsert(url.trim());
  }

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="modal-dialog" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>リンクを挿入</h3>
          <button type="button" className="modal-close" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>URL</label>
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)', fontSize: 14,
                }}
              />
            </div>
          </div>
          <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
            <button
              type="submit" className="btn"
              disabled={!url.trim()}
              style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
            >挿入</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Image Insert Modal ── */
function ImageModal({ open, onInsert, onCancel }) {
  const [url, setUrl] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUrl('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (url.trim()) onInsert(url.trim());
  }

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>画像を挿入</h3>
          <button type="button" className="modal-close" onClick={onCancel}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>画像URL</label>
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)', fontSize: 14,
                }}
              />
            </div>
            {url.trim() && (
              <div style={{
                padding: 12, background: 'var(--line-light)', borderRadius: 'var(--radius)',
                textAlign: 'center',
              }}>
                <img
                  src={url}
                  alt="プレビュー"
                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 'var(--radius)' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                  onLoad={e => { e.currentTarget.style.display = 'block'; }}
                />
              </div>
            )}
          </div>
          <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>キャンセル</button>
            <button
              type="submit" className="btn"
              disabled={!url.trim()}
              style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
            >挿入</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Toolbar Button ── */
function TBtn({ onClick, active, children, title, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? 'is-active' : ''}
      title={title}
      style={style}
    >
      {children}
    </button>
  );
}

/* ── Color Picker Dropdown ── */
function ColorPicker({ editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!editor) return null;

  const currentColor = editor.getAttributes('textStyle').color || '#000000';

  return (
    <div className="tiptap-color-wrap" ref={ref}>
      <button
        type="button"
        className="tiptap-color-trigger"
        title="文字色"
        onClick={() => setOpen(!open)}
      >
        <span>A</span>
        <span className="tiptap-color-indicator" style={{ background: currentColor }} />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2 }}>
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="tiptap-color-dropdown">
          {PRESET_COLORS.map(({ color, label }) => (
            <button
              key={color}
              type="button"
              className={`tiptap-color-swatch${currentColor === color ? ' active' : ''}`}
              title={label}
              style={{ background: color }}
              onClick={() => {
                editor.chain().focus().setColor(color).run();
                setOpen(false);
              }}
            />
          ))}
          <button
            type="button"
            className="tiptap-color-reset"
            onClick={() => {
              editor.chain().focus().unsetColor().run();
              setOpen(false);
            }}
          >リセット</button>
        </div>
      )}
    </div>
  );
}

/* ── Inline SVG icons for alignment ── */
function AlignLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" />
    </svg>
  );
}
function AlignCenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
function AlignRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" />
    </svg>
  );
}

/* ── Image Floating Toolbar (positioned above selected image) ── */
function ImageToolbar({ editor, wrapRef }) {
  const [pos, setPos] = useState(null);
  const [attrs, setAttrs] = useState({});

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { state } = editor;
      const node = state.doc.nodeAt(state.selection.from);
      if (!node || node.type.name !== 'image') {
        setPos(null);
        return;
      }
      setAttrs(node.attrs);
      // Find the DOM node for positioning
      try {
        const domNode = editor.view.nodeDOM(state.selection.from);
        const imgEl = domNode?.tagName === 'IMG' ? domNode : domNode?.querySelector?.('img');
        const wrapEl = wrapRef?.current;
        if (imgEl && wrapEl) {
          const imgRect = imgEl.getBoundingClientRect();
          const wrapRect = wrapEl.getBoundingClientRect();
          setPos({
            top: imgRect.top - wrapRect.top - 42,
            left: imgRect.left - wrapRect.left + imgRect.width / 2,
          });
        }
      } catch {
        setPos(null);
      }
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor, wrapRef]);

  if (!pos || !editor) return null;

  const updateImageAttr = (newAttrs) => {
    const { state, dispatch } = editor.view;
    const { selection } = state;
    const node = state.doc.nodeAt(selection.from);
    if (!node || node.type.name !== 'image') return;
    const tr = state.tr.setNodeMarkup(selection.from, undefined, { ...node.attrs, ...newAttrs });
    dispatch(tr);
  };

  const currentWidth = attrs.style?.match(/max-width:\s*([^;]+)/)?.[1] || '400px';
  const currentAlign = attrs['data-align'] || 'center';

  return (
    <div
      className="tiptap-img-toolbar"
      style={{ position: 'absolute', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 30 }}
    >
      <div className="tiptap-img-toolbar-group">
        {IMAGE_SIZES.map(({ label, width }) => (
          <button
            key={label}
            type="button"
            className={currentWidth === width ? 'is-active' : ''}
            onMouseDown={(e) => { e.preventDefault(); updateImageAttr({ style: `max-width: ${width}; height: auto;` }); }}
            title={`サイズ: ${label}`}
          >{label}</button>
        ))}
      </div>
      <span className="tiptap-img-toolbar-sep" />
      <div className="tiptap-img-toolbar-group">
        <button type="button" className={currentAlign === 'left' ? 'is-active' : ''}
          onMouseDown={(e) => { e.preventDefault(); updateImageAttr({ 'data-align': 'left' }); }} title="左寄せ"
        ><AlignLeftIcon /></button>
        <button type="button" className={currentAlign === 'center' ? 'is-active' : ''}
          onMouseDown={(e) => { e.preventDefault(); updateImageAttr({ 'data-align': 'center' }); }} title="中央"
        ><AlignCenterIcon /></button>
        <button type="button" className={currentAlign === 'right' ? 'is-active' : ''}
          onMouseDown={(e) => { e.preventDefault(); updateImageAttr({ 'data-align': 'right' }); }} title="右寄せ"
        ><AlignRightIcon /></button>
      </div>
    </div>
  );
}

/* ── Custom Image Extension with alignment and size attributes ── */
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-align': {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs['data-align'] || 'center' }),
      },
      style: {
        default: 'max-width: 400px; height: auto;',
        parseHTML: (el) => el.getAttribute('style') || 'max-width: 400px; height: auto;',
        renderHTML: (attrs) => ({ style: attrs.style || 'max-width: 400px; height: auto;' }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes['data-align'] || 'center';
    const wrapStyle =
      align === 'center' ? 'text-align: center;'
      : align === 'right' ? 'text-align: right;'
      : 'text-align: left;';

    return ['div', { style: wrapStyle, 'data-image-wrap': '' }, ['img', HTMLAttributes]];
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-image-wrap] img',
        getAttrs: (el) => {
          const wrap = el.closest('[data-image-wrap]');
          const wrapAlign = wrap?.style?.textAlign;
          return {
            src: el.getAttribute('src'),
            alt: el.getAttribute('alt'),
            style: el.getAttribute('style') || 'max-width: 400px; height: auto;',
            'data-align': wrapAlign === 'right' ? 'right' : wrapAlign === 'left' ? 'left' : 'center',
          };
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (el) => ({
          src: el.getAttribute('src'),
          alt: el.getAttribute('alt'),
          style: el.getAttribute('style') || 'max-width: 400px; height: auto;',
          'data-align': el.getAttribute('data-align') || 'center',
        }),
      },
    ];
  },
});

/* ── Menu Bar ── */
function MenuBar({ editor, onLinkClick, onImageClick }) {
  if (!editor) return null;

  return (
    <div className="tiptap-toolbar">
      {/* Group 1: Headings */}
      <TBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="見出し2"
      >H2</TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="見出し3"
      >H3</TBtn>
      <TBtn
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive('paragraph') && !editor.isActive('heading')}
        title="本文"
      >本文</TBtn>

      <span className="tiptap-separator" />

      {/* Group 2: Formatting */}
      <TBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="太字"
        style={{ fontWeight: 800 }}
      >B</TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="斜体"
        style={{ fontStyle: 'italic' }}
      >I</TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="下線"
        style={{ textDecoration: 'underline' }}
      >U</TBtn>

      <span className="tiptap-separator" />

      {/* Group 3: Text Color */}
      <ColorPicker editor={editor} />

      <span className="tiptap-separator" />

      {/* Group 4: Lists */}
      <TBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="箇条書き"
      >箇条書き</TBtn>
      <TBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="番号リスト"
      >番号</TBtn>

      <span className="tiptap-separator" />

      {/* Group 5: Text Align */}
      <TBtn
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
        title="左揃え"
      ><AlignLeftIcon /></TBtn>
      <TBtn
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
        title="中央揃え"
      ><AlignCenterIcon /></TBtn>
      <TBtn
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
        title="右揃え"
      ><AlignRightIcon /></TBtn>

      <span className="tiptap-separator" />

      {/* Group 6: Insert */}
      <TBtn
        onClick={onLinkClick}
        active={editor.isActive('link')}
        title="リンク挿入"
      >リンク</TBtn>
      {editor.isActive('link') && (
        <TBtn
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="リンク解除"
        >解除</TBtn>
      )}
      <TBtn
        onClick={onImageClick}
        title="画像挿入"
      >画像</TBtn>
      <TBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="水平線"
      >―</TBtn>
    </div>
  );
}

export default function RichTextEditor({ content, onChange, placeholder }) {
  const isInitialRef = useRef(true);
  const [linkModal, setLinkModal] = useState(false);
  const [imageModal, setImageModal] = useState(false);
  const [linkInitialUrl, setLinkInitialUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);
  const editorWrapRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        dropcursor: { color: '#4f46e5', width: 2 },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      Underline,
      CustomImage,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: placeholder || '本文を入力してください...',
      }),
    ],
    content: content || '',
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== undefined) {
      if (isInitialRef.current) {
        isInitialRef.current = false;
        if (editor.getHTML() !== content) {
          editor.commands.setContent(content || '');
        }
        return;
      }
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content || '');
      }
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Drag & Drop image as Base64 ── */
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer?.types?.includes('Files')) {
      setDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const insertBase64Image = useCallback((file) => {
    if (!editor || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor
        .chain()
        .focus()
        .setImage({
          src: reader.result,
          style: 'max-width: 400px; height: auto;',
          'data-align': 'center',
        })
        .run();
    };
    reader.readAsDataURL(file);
  }, [editor]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        insertBase64Image(file);
      }
    }
  }, [insertBase64Image]);

  function handleLinkClick() {
    if (editor) {
      const existing = editor.getAttributes('link').href || '';
      setLinkInitialUrl(existing);
    }
    setLinkModal(true);
  }

  function handleLinkInsert(url) {
    if (editor && url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkModal(false);
  }

  function handleImageClick() {
    setImageModal(true);
  }

  function handleImageInsert(url) {
    if (editor && url) {
      editor
        .chain()
        .focus()
        .setImage({
          src: url,
          style: 'max-width: 400px; height: auto;',
          'data-align': 'center',
        })
        .run();
    }
    setImageModal(false);
  }

  return (
    <>
      <div
        className="tiptap-editor"
        ref={editorWrapRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <MenuBar editor={editor} onLinkClick={handleLinkClick} onImageClick={handleImageClick} />
        <ImageToolbar editor={editor} wrapRef={editorWrapRef} />
        <EditorContent editor={editor} className="tiptap-content" />
        {dragging && (
          <div className="tiptap-drop-overlay">
            <div className="tiptap-drop-overlay-inner">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M20 8v16M12 18l8 8 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 28v4a2 2 0 002 2h24a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <span>画像をドロップして挿入</span>
            </div>
          </div>
        )}
      </div>
      <LinkModal
        open={linkModal}
        initialUrl={linkInitialUrl}
        onInsert={handleLinkInsert}
        onCancel={() => setLinkModal(false)}
      />
      <ImageModal
        open={imageModal}
        onInsert={handleImageInsert}
        onCancel={() => setImageModal(false)}
      />
    </>
  );
}
