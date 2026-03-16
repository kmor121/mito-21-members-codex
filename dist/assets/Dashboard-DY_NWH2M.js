import{r as c,e as M,j as e,L as v}from"./index-BIQtBNdW.js";import{u as Y}from"./useIsMobile-B0aCEZCA.js";import{f as G}from"./formatName-qHLFw6zo.js";const L=new Map,V=3e4;function I(s){const t=L.get(s);if(t){if(Date.now()-t.ts>V){L.delete(s);return}return t}}function J(s,t){L.set(s,{data:t,ts:Date.now(),promise:null})}function Q(s){const t=L.get(s);return t!=null&&t.promise?t.promise:null}function U(s,t){const n=L.get(s);n?n.promise=t:L.set(s,{data:null,ts:0,promise:t})}async function X(s,{signal:t,maxRetries:n=3,retryDelay:o=2e3}={}){let l;for(let u=0;u<=n;u++){if(t!=null&&t.aborted)throw new DOMException("Aborted","AbortError");try{return await s()}catch(x){l=x;const m=((x==null?void 0:x.message)||"").toLowerCase();if(!(m.includes("rate limit")||m.includes("429")||m.includes("too many"))||u===n)throw x;await new Promise((C,d)=>{const h=setTimeout(C,o*(u+1));t&&t.addEventListener("abort",()=>{clearTimeout(h),d(new DOMException("Aborted","AbortError"))},{once:!0})})}}throw l}function z(s,t,n={}){const{enabled:o=!0,deps:l=[]}=n,[u,x]=c.useState(()=>{const j=I(s);return j?j.data:null}),[m,f]=c.useState(()=>o&&!I(s)),[C,d]=c.useState(""),h=c.useRef(null),y=c.useRef(!0),w=c.useCallback(async(j=!1)=>{if(!o)return;if(!j){const i=I(s);if(i){x(i.data),f(!1),d("");return}}const _=Q(s);if(_&&!j)try{const i=await _;y.current&&(x(i),f(!1),d(""));return}catch{}h.current&&h.current.abort();const D=new AbortController;h.current=D,f(!0),d("");const A=X(t,{signal:D.signal}).then(i=>(J(s,i),y.current&&!D.signal.aborted&&(x(i),f(!1)),i)).catch(i=>{if((i==null?void 0:i.name)!=="AbortError"&&y.current){const b=((i==null?void 0:i.message)||"").toLowerCase(),p=b.includes("rate limit")||b.includes("429")||b.includes("too many");d(p?"リクエスト制限に達しました。しばらく待ってから再読み込みしてください。":(i==null?void 0:i.message)||"データの取得に失敗しました。"),f(!1)}});j||U(s,A)},[s,o,t]);c.useEffect(()=>(y.current=!0,w(),()=>{y.current=!1,h.current&&h.current.abort()}),[s,o,...l]);const F=c.useCallback(()=>w(!0),[w]);return{data:u,loading:m,error:C,refresh:F}}function $({width:s="100%",height:t=16,radius:n=6,style:o}){return e.jsx("div",{className:"db-skeleton",style:{width:s,height:t,borderRadius:n,...o}})}function q({lines:s=3}){return e.jsxs("div",{className:"db-card db-skeleton-card",children:[e.jsx($,{width:"40%",height:14,style:{marginBottom:12}}),Array.from({length:s}).map((t,n)=>e.jsx($,{width:n===s-1?"60%":"90%",height:12,style:{marginBottom:8}},n))]})}function O(s){return s>=80?"var(--success)":s>=50?"var(--warning)":"var(--error)"}function k({color:s}){return e.jsx("span",{style:{display:"inline-block",width:8,height:8,borderRadius:"50%",background:s,marginRight:6,flexShrink:0}})}function E({title:s,loading:t,error:n,children:o,linkTo:l,linkLabel:u}){return e.jsxs("div",{className:`db-card${t?"":" db-fade-in"}`,children:[e.jsxs("div",{className:"db-card-header",children:[e.jsx("span",{className:"db-card-title",children:s}),l&&!t&&e.jsx(v,{className:"text-link",to:l,style:{fontSize:12},children:u||"詳細"})]}),e.jsx("div",{className:"db-card-body",children:n?e.jsx("p",{style:{color:"var(--error)",fontSize:13},children:n}):o})]})}function H(s){if(!s)return"-";const t=typeof s=="string"?s.slice(0,10):"";if(!t)return"-";const[n,o,l]=t.split("-");return`${Number(o)}/${Number(l)}`}function Z(s){if(!s)return"-";const t=typeof s=="string"?s:"";return t.length>=16?`${H(t)} ${t.slice(11,16)}`:H(t)}const K={status:"ステータス",member_type:"会員種別",approval_status:"承認状態",app_role:"権限",last_name:"姓",first_name:"名",email:"メール",phone:"電話",company_name:"会社名",position:"役職"};function re(){var W;const s=Y(),{data:t,loading:n,error:o}=z("dash:members:approved",()=>M.entities.Member.filter({approval_status:"承認済"})),{data:l,loading:u,error:x}=z("dash:members:pending",()=>M.entities.Member.filter({approval_status:"申請中"})),{data:m,loading:f,error:C}=z("dash:fy:all",()=>M.entities.FiscalYear.list()),{data:d,loading:h,error:y}=z("dash:dues:all",()=>M.entities.Due.list()),{data:w,loading:F,error:j}=z("dash:meetings:all",()=>M.entities.Meeting.list("-meeting_date",10)),{data:_,loading:D,error:A}=z("dash:logs:recent",()=>M.entities.MemberChangeLog.list("-changed_at",10)),i=c.useMemo(()=>{if(!t)return null;const r=t;return{total:r.filter(a=>a.status==="活動中").length,regular:r.filter(a=>a.member_type==="正会員"&&a.status==="活動中").length,supporting:r.filter(a=>a.member_type==="賛助会員"&&a.status==="活動中").length,ob:r.filter(a=>a.member_type==="OB会員"&&a.status==="活動中").length,paused:r.filter(a=>a.status==="休会").length,newMember:r.filter(a=>a.is_new===!0).length}},[t]),b=c.useMemo(()=>{if(!m||!d)return null;const r=m.find(S=>S.is_current===!0);if(!r)return{paid:0,total:0,rate:0,fyLabel:"-"};const a=d.filter(S=>S.fiscal_year_id===r.id),g=a.filter(S=>S.status==="納入済").length,N=a.length,T=N>0?Math.round(g/N*100):0;return{paid:g,total:N,rate:T,fyLabel:r.label||r.name||"-"}},[m,d]),p=c.useMemo(()=>{if(!w)return null;const r=new Date().toISOString().slice(0,10);return w.filter(g=>g.meeting_date>=r&&(g.status==="下書き"||g.status==="確定")).sort((g,N)=>g.meeting_date.localeCompare(N.meeting_date))[0]||null},[w]),B=(l==null?void 0:l.length)||0,R=c.useMemo(()=>{if(!m||!d)return[];const r=m.find(a=>a.is_current===!0);return r?d.filter(a=>a.fiscal_year_id===r.id&&a.status==="未納"):[]},[m,d]),P=c.useMemo(()=>{if(!t)return{};const r={};return t.forEach(a=>{r[String(a.id)]=a}),r},[t]);return e.jsxs("section",{className:"admin-shell",children:[e.jsxs("div",{className:"page-header",children:[e.jsx("h1",{className:"page-title",children:"ダッシュボード"}),!s&&e.jsx("p",{className:"page-description",children:"管理者ダッシュボード"})]}),e.jsxs("div",{className:"db-tier1",children:[n?e.jsx(q,{lines:4}):e.jsx(E,{title:"会員概要",loading:!1,error:o,linkTo:"/admin/members",linkLabel:"会員一覧",children:i&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"db-big-number",children:[i.total,e.jsx("span",{className:"db-big-unit",children:"名"})]}),e.jsxs("div",{className:"db-stat-grid",children:[e.jsxs("div",{className:"db-stat-row",children:[e.jsx(k,{color:"var(--primary)"}),"正会員",e.jsx("span",{className:"db-stat-val",children:i.regular})]}),e.jsxs("div",{className:"db-stat-row",children:[e.jsx(k,{color:"#8b5cf6"}),"賛助会員",e.jsx("span",{className:"db-stat-val",children:i.supporting})]}),e.jsxs("div",{className:"db-stat-row",children:[e.jsx(k,{color:"var(--muted)"}),"OB会員",e.jsx("span",{className:"db-stat-val",children:i.ob})]}),e.jsxs("div",{className:"db-stat-row",children:[e.jsx(k,{color:"var(--warning)"}),"休会",e.jsx("span",{className:"db-stat-val",children:i.paused})]}),i.newMember>0&&e.jsxs("div",{className:"db-stat-row",children:[e.jsx(k,{color:"var(--success)"}),"新入会員",e.jsx("span",{className:"db-stat-val",children:i.newMember})]})]})]})}),f||h?e.jsx(q,{lines:3}):e.jsx(E,{title:"会費納入率",loading:!1,error:C||y,linkTo:"/admin/dues-management",linkLabel:"会費管理",children:b&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"db-big-number",style:{color:O(b.rate)},children:[b.rate,e.jsx("span",{className:"db-big-unit",children:"%"})]}),e.jsx("div",{className:"db-progress-track",children:e.jsx("div",{className:"db-progress-fill",style:{width:`${b.rate}%`,background:O(b.rate)}})}),e.jsxs("p",{className:"db-sub-text",children:[b.paid," / ",b.total," 名が納入済"]})]})}),F?e.jsx(q,{lines:3}):e.jsx(E,{title:"次回幹事会",loading:!1,error:j,linkTo:"/admin/meetings",linkLabel:"幹事会一覧",children:p?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"db-meeting-title",children:p.title}),e.jsxs("div",{className:"db-meeting-meta",children:[e.jsx("span",{children:(W=p.meeting_date)==null?void 0:W.replace(/-/g,"/")}),p.start_time&&e.jsxs("span",{children:[p.start_time,"〜",p.end_time||""]})]}),p.location&&e.jsx("p",{className:"db-sub-text",children:p.location}),e.jsx("span",{className:"pill",style:{marginTop:4,fontSize:11},children:p.status==="確定"?"公開":"下書き"})]}):e.jsx("p",{className:"db-sub-text",children:"予定されている幹事会はありません"})})]}),e.jsxs("div",{className:"db-tier2",children:[u||f||h?e.jsx(q,{lines:4}):e.jsx(E,{title:"要対応",loading:!1,error:x,children:e.jsxs("div",{className:"db-action-list",children:[e.jsxs(v,{to:"/admin/applications",className:"db-action-item",style:B>0?{background:"var(--warning-light)"}:void 0,children:[e.jsxs("div",{className:"db-action-left",children:[e.jsx(k,{color:B>0?"var(--warning)":"var(--muted)"}),e.jsx("span",{children:"入会申請"})]}),e.jsxs("span",{className:"db-action-badge",style:B>0?{background:"var(--warning)",color:"#fff"}:void 0,children:[B,"件"]})]}),e.jsxs(v,{to:"/admin/dues-management",className:"db-action-item",style:R.length>0?{background:"var(--error-light)"}:void 0,children:[e.jsxs("div",{className:"db-action-left",children:[e.jsx(k,{color:R.length>0?"var(--error)":"var(--muted)"}),e.jsx("span",{children:"未納会費"})]}),e.jsxs("span",{className:"db-action-badge",style:R.length>0?{background:"var(--error)",color:"#fff"}:void 0,children:[R.length,"件"]})]})]})}),D?e.jsx(q,{lines:5}):e.jsx(E,{title:"最近の活動",loading:!1,error:A,children:!_||_.length===0?e.jsx("p",{className:"db-sub-text",children:"活動ログはありません"}):e.jsx("div",{className:"db-log-list",children:_.slice(0,8).map((r,a)=>{const g=P[String(r.member_id)],N=g?G(g):`ID:${r.member_id}`,T=K[r.field_name]||r.field_name;return e.jsxs("div",{className:"db-log-item",children:[e.jsxs("div",{className:"db-log-top",children:[e.jsx("span",{className:"db-log-name",children:N}),e.jsx("span",{className:"db-log-time",children:Z(r.changed_at)})]}),e.jsxs("div",{className:"db-log-detail",children:[e.jsx("span",{className:"db-log-field",children:T}),r.old_value&&e.jsx("span",{className:"db-log-old",children:r.old_value}),r.old_value&&r.new_value&&e.jsx("span",{className:"db-log-arrow",children:"→"}),r.new_value&&e.jsx("span",{className:"db-log-new",children:r.new_value})]}),e.jsxs("span",{className:"db-log-by",children:[r.changed_by,"（",r.changed_by_role==="admin"?"管理者":"本人","）"]})]},r.id||a)})})})]}),e.jsx("div",{className:"db-tier3",children:e.jsxs("div",{className:"db-card db-fade-in",children:[e.jsx("div",{className:"db-card-header",children:e.jsx("span",{className:"db-card-title",children:"クイックアクション"})}),e.jsxs("div",{className:"db-quick-grid",children:[e.jsxs(v,{className:"db-quick-btn",to:"/admin/members",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("path",{d:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"}),e.jsx("circle",{cx:"9",cy:"7",r:"4"}),e.jsx("path",{d:"M23 21v-2a4 4 0 00-3-3.87"}),e.jsx("path",{d:"M16 3.13a4 4 0 010 7.75"})]}),"会員一覧"]}),e.jsxs(v,{className:"db-quick-btn",to:"/admin/applications",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("path",{d:"M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"}),e.jsx("circle",{cx:"8.5",cy:"7",r:"4"}),e.jsx("line",{x1:"20",y1:"8",x2:"20",y2:"14"}),e.jsx("line",{x1:"23",y1:"11",x2:"17",y2:"11"})]}),"申込管理"]}),e.jsxs(v,{className:"db-quick-btn",to:"/admin/dues-management",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("rect",{x:"1",y:"4",width:"22",height:"16",rx:"2",ry:"2"}),e.jsx("line",{x1:"1",y1:"10",x2:"23",y2:"10"})]}),"会費管理"]}),e.jsxs(v,{className:"db-quick-btn",to:"/admin/meetings",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("rect",{x:"3",y:"4",width:"18",height:"18",rx:"2",ry:"2"}),e.jsx("line",{x1:"16",y1:"2",x2:"16",y2:"6"}),e.jsx("line",{x1:"8",y1:"2",x2:"8",y2:"6"}),e.jsx("line",{x1:"3",y1:"10",x2:"21",y2:"10"})]}),"幹事会管理"]}),e.jsxs(v,{className:"db-quick-btn",to:"/admin/newsletters",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),e.jsx("polyline",{points:"22,6 12,13 2,6"})]}),"配信管理"]}),e.jsxs(v,{className:"db-quick-btn",to:"/admin/organization-chart",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("rect",{x:"2",y:"3",width:"20",height:"14",rx:"2",ry:"2"}),e.jsx("line",{x1:"8",y1:"21",x2:"16",y2:"21"}),e.jsx("line",{x1:"12",y1:"17",x2:"12",y2:"21"})]}),"組織図管理"]})]})]})}),e.jsx("style",{children:`
        /* ── skeleton pulse ── */
        .db-skeleton {
          background: linear-gradient(90deg, var(--line-light) 25%, #e8ecf1 50%, var(--line-light) 75%);
          background-size: 200% 100%;
          animation: db-shimmer 1.5s infinite;
        }
        @keyframes db-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .db-skeleton-card {
          padding: 20px;
          min-height: 120px;
        }

        /* ── fade-in ── */
        .db-fade-in {
          animation: db-fadein 0.35s ease;
        }
        @keyframes db-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── card ── */
        .db-card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }
        .db-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px 10px;
          border-bottom: 1px solid var(--line-light);
        }
        .db-card-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.02em;
        }
        .db-card-body {
          padding: 14px 18px 18px;
        }

        /* ── tier layouts ── */
        .db-tier1 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 16px;
        }
        .db-tier2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .db-tier3 {
          margin-bottom: 8px;
        }

        /* ── big KPI number ── */
        .db-big-number {
          font-size: 32px;
          font-weight: 800;
          color: var(--text);
          line-height: 1.1;
          margin-bottom: 8px;
        }
        .db-big-unit {
          font-size: 14px;
          font-weight: 600;
          margin-left: 2px;
          color: var(--text-secondary);
        }

        /* ── stat grid (member breakdown) ── */
        .db-stat-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .db-stat-row {
          display: flex;
          align-items: center;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .db-stat-val {
          margin-left: auto;
          font-weight: 700;
          color: var(--text);
          font-size: 14px;
        }

        /* ── progress bar ── */
        .db-progress-track {
          width: 100%;
          height: 8px;
          background: var(--line-light);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .db-progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s ease;
        }

        /* ── sub text ── */
        .db-sub-text {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0;
        }

        /* ── meeting card ── */
        .db-meeting-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 6px;
        }
        .db-meeting-meta {
          display: flex;
          gap: 12px;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        /* ── action items ── */
        .db-action-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .db-action-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          text-decoration: none;
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          transition: box-shadow var(--transition);
        }
        .db-action-item:hover {
          box-shadow: var(--shadow);
        }
        .db-action-left {
          display: flex;
          align-items: center;
        }
        .db-action-badge {
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          background: var(--line-light);
          color: var(--text-secondary);
        }

        /* ── activity log ── */
        .db-log-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .db-log-item {
          padding-bottom: 10px;
          border-bottom: 1px solid var(--line-light);
        }
        .db-log-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .db-log-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }
        .db-log-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text);
        }
        .db-log-time {
          font-size: 11px;
          color: var(--muted);
        }
        .db-log-detail {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary);
          flex-wrap: wrap;
        }
        .db-log-field {
          font-weight: 600;
          color: var(--text);
        }
        .db-log-old {
          color: var(--error);
          text-decoration: line-through;
        }
        .db-log-arrow {
          color: var(--muted);
        }
        .db-log-new {
          color: var(--success);
          font-weight: 600;
        }
        .db-log-by {
          font-size: 11px;
          color: var(--muted);
        }

        /* ── quick action grid ── */
        .db-quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 14px 18px 18px;
        }
        .db-quick-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          background: var(--panel);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: all var(--transition);
        }
        .db-quick-btn:hover {
          background: var(--primary-light);
          border-color: var(--primary-100);
          color: var(--primary);
        }
        .db-quick-btn svg {
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .db-quick-btn:hover svg {
          color: var(--primary);
        }

        /* ── mobile ── */
        @media (max-width: 768px) {
          .db-tier1 {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .db-tier2 {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .db-quick-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            padding: 12px 14px 14px;
          }
          .db-card-header {
            padding: 12px 14px 8px;
          }
          .db-card-body {
            padding: 12px 14px 14px;
          }
          .db-big-number {
            font-size: 26px;
          }
          .db-quick-btn {
            padding: 8px 10px;
            font-size: 12px;
          }
        }
      `})]})}export{re as default};
