import{r as c,e as S,j as e,L as C}from"./index-DsdqtLl4.js";import{u as $}from"./useIsMobile-B4xA9vZ0.js";const _=new Map,I=3e4;function T(t){const r=_.get(t);if(r){if(Date.now()-r.ts>I){_.delete(t);return}return r}}function Y(t,r){_.set(t,{data:r,ts:Date.now(),promise:null})}function P(t){const r=_.get(t);return r!=null&&r.promise?r.promise:null}function U(t,r){const a=_.get(t);a?a.promise=r:_.set(t,{data:null,ts:0,promise:r})}async function H(t,{signal:r,maxRetries:a=3,retryDelay:n=2e3}={}){let b;for(let x=0;x<=a;x++){if(r!=null&&r.aborted)throw new DOMException("Aborted","AbortError");try{return await t()}catch(s){b=s;const f=((s==null?void 0:s.message)||"").toLowerCase();if(!(f.includes("rate limit")||f.includes("429")||f.includes("too many"))||x===a)throw s;await new Promise((w,u)=>{const h=setTimeout(w,n*(x+1));r&&r.addEventListener("abort",()=>{clearTimeout(h),u(new DOMException("Aborted","AbortError"))},{once:!0})})}}throw b}function q(t,r,a={}){const{enabled:n=!0,deps:b=[]}=a,[x,s]=c.useState(()=>{const o=T(t);return o?o.data:null}),[f,v]=c.useState(()=>n&&!T(t)),[w,u]=c.useState(""),h=c.useRef(null),p=c.useRef(!0),M=c.useCallback(async(o=!1)=>{if(!n)return;if(!o){const i=T(t);if(i){s(i.data),v(!1),u("");return}}const z=P(t);if(z&&!o)try{const i=await z;p.current&&(s(i),v(!1),u(""));return}catch{}h.current&&h.current.abort();const j=new AbortController;h.current=j,v(!0),u("");const d=H(r,{signal:j.signal}).then(i=>(Y(t,i),p.current&&!j.signal.aborted&&(s(i),v(!1)),i)).catch(i=>{if((i==null?void 0:i.name)!=="AbortError"&&p.current){const y=((i==null?void 0:i.message)||"").toLowerCase(),k=y.includes("rate limit")||y.includes("429")||y.includes("too many");u(k?"リクエスト制限に達しました。しばらく待ってから再読み込みしてください。":(i==null?void 0:i.message)||"データの取得に失敗しました。"),v(!1)}});o||U(t,d)},[t,n,r]);c.useEffect(()=>(p.current=!0,M(),()=>{p.current=!1,h.current&&h.current.abort()}),[t,n,...b]);const F=c.useCallback(()=>M(!0),[M]);return{data:x,loading:f,error:w,refresh:F}}function A({width:t="100%",height:r=16,radius:a=6,style:n}){return e.jsx("div",{className:"db-skeleton",style:{width:t,height:r,borderRadius:a,...n}})}function E({lines:t=3}){return e.jsxs("div",{className:"db-card db-skeleton-card",children:[e.jsx(A,{width:"40%",height:14,style:{marginBottom:12}}),Array.from({length:t}).map((r,a)=>e.jsx(A,{width:a===t-1?"60%":"90%",height:12,style:{marginBottom:8}},a))]})}function B(t){return t>=80?"var(--success)":t>=50?"var(--warning)":"var(--error)"}function W({color:t}){return e.jsx("span",{style:{display:"inline-block",width:8,height:8,borderRadius:"50%",background:t,marginRight:6,flexShrink:0}})}function R({title:t,loading:r,error:a,children:n,linkTo:b,linkLabel:x,delay:s=0}){return e.jsxs("div",{className:`db-card${r?"":" db-fade-in"}`,style:s?{animationDelay:`${s}ms`}:void 0,children:[e.jsxs("div",{className:"db-card-header",children:[e.jsx("span",{className:"db-card-title",children:t}),b&&!r&&e.jsx(C,{className:"text-link",to:b,style:{fontSize:12},children:x||"詳細"})]}),e.jsx("div",{className:"db-card-body",children:a?e.jsx("p",{style:{color:"var(--error)",fontSize:13,margin:0},children:a}):n})]})}function O(t){if(!t)return"-";const r=new Date(t);if(isNaN(r.getTime()))return t;const a=["日","月","火","水","木","金","土"][r.getDay()];return`${r.getMonth()+1}/${r.getDate()}(${a})`}function Z(){$();const{data:t,loading:r,error:a}=q("dash:members:approved",()=>S.entities.Member.filter({approval_status:"承認済"})),{data:n,loading:b,error:x}=q("dash:members:pending",()=>S.entities.Member.filter({approval_status:"申請中"})),{data:s,loading:f,error:v}=q("dash:fy:all",()=>S.entities.FiscalYear.list()),{data:w,loading:u,error:h}=q("dash:dues:all",()=>S.entities.Due.list()),{data:p,loading:M,error:F}=q("dash:meetings:all",()=>S.entities.Meeting.list("-meeting_date",10)),o=c.useMemo(()=>s&&s.find(m=>m.is_current===!0)||null,[s]),z=o?o.year_label||(o.year?`${o.year}年度`:""):"",j=c.useMemo(()=>{if(!t)return null;const m=t;return{total:m.filter(l=>l.status==="活動中").length,regular:m.filter(l=>l.member_type==="正会員"&&l.status==="活動中").length,supporting:m.filter(l=>l.member_type==="賛助会員"&&l.status==="活動中").length}},[t]),d=c.useMemo(()=>{if(!o||!w)return null;const m=w.filter(L=>L.fiscal_year_id===o.id),l=m.filter(L=>L.status==="納入済").length,N=m.length,g=m.filter(L=>L.status==="未納").length,D=N>0?Math.round(l/N*100):0;return{paid:l,total:N,unpaid:g,rate:D}},[o,w]),i=c.useMemo(()=>{if(!p)return null;const m=new Date().toISOString().slice(0,10),l=p.filter(g=>g.meeting_date>=m&&g.status==="公開").sort((g,D)=>g.meeting_date.localeCompare(D.meeting_date));if(l.length>0)return{...l[0],isUpcoming:!0};const N=p.filter(g=>g.status==="完了").sort((g,D)=>(D.meeting_date||"").localeCompare(g.meeting_date||""));return N.length>0?{...N[0],isUpcoming:!1}:null},[p]),y=(n==null?void 0:n.length)||0,k=(d==null?void 0:d.unpaid)||0;return e.jsxs("section",{className:"admin-shell",children:[e.jsxs("div",{className:"page-header",style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:8},children:[e.jsxs("div",{children:[e.jsx("h1",{className:"page-title",children:"ダッシュボード"}),e.jsx("p",{className:"page-description",children:"水戸21の会 管理者ダッシュボード"})]}),z&&e.jsx("span",{className:"db-fy-badge",children:z})]}),e.jsxs("div",{className:"db-tier1",children:[r?e.jsx(E,{lines:3}):e.jsx(R,{title:"会員概況",loading:!1,error:a,linkTo:"/admin/members",linkLabel:"会員一覧",delay:0,children:j&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"db-big-number",children:[j.total,e.jsx("span",{className:"db-big-unit",children:"名"})]}),e.jsxs("div",{className:"db-stat-grid",children:[e.jsxs("div",{className:"db-stat-row",children:[e.jsx(W,{color:"var(--primary)"}),"正会員",e.jsx("span",{className:"db-stat-val",children:j.regular})]}),e.jsxs("div",{className:"db-stat-row",children:[e.jsx(W,{color:"#8b5cf6"}),"賛助会員",e.jsx("span",{className:"db-stat-val",children:j.supporting})]})]})]})}),f||u?e.jsx(E,{lines:3}):e.jsx(R,{title:"会費回収状況",loading:!1,error:v||h,linkTo:"/admin/dues-management",linkLabel:"会費管理",delay:50,children:d&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"db-big-number",style:{color:B(d.rate)},children:[d.rate,e.jsx("span",{className:"db-big-unit",children:"%"})]}),e.jsx("div",{className:"db-progress-track",children:e.jsx("div",{className:"db-progress-fill",style:{width:`${d.rate}%`,background:B(d.rate)}})}),e.jsxs("p",{className:"db-sub-text",children:[d.paid," / ",d.total," 名が納入済",d.unpaid>0&&e.jsxs("span",{style:{color:"var(--error)",fontWeight:600,marginLeft:8},children:["未納 ",d.unpaid,"件"]})]})]})}),M?e.jsx(E,{lines:3}):e.jsx(R,{title:i!=null&&i.isUpcoming?"次回幹事会":"直近の幹事会",loading:!1,error:F,linkTo:"/admin/meetings",linkLabel:"幹事会一覧",delay:100,children:i?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"db-meeting-title",children:i.title}),e.jsxs("div",{className:"db-meeting-meta",children:[e.jsxs("span",{className:"db-meeting-meta-item",children:[e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[e.jsx("rect",{x:"1.75",y:"2.75",width:"10.5",height:"9.5",rx:"1.5",stroke:"currentColor",strokeWidth:"1.2"}),e.jsx("path",{d:"M1.75 5.75h10.5",stroke:"currentColor",strokeWidth:"1.2"}),e.jsx("line",{x1:"4.5",y1:"1.25",x2:"4.5",y2:"3.75",stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round"}),e.jsx("line",{x1:"9.5",y1:"1.25",x2:"9.5",y2:"3.75",stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round"})]}),O(i.meeting_date)]}),i.start_time&&e.jsxs("span",{className:"db-meeting-meta-item",children:[e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:[e.jsx("circle",{cx:"7",cy:"7",r:"5.25",stroke:"currentColor",strokeWidth:"1.2"}),e.jsx("path",{d:"M7 4.25V7l2.25 1.5",stroke:"currentColor",strokeWidth:"1.2",strokeLinecap:"round",strokeLinejoin:"round"})]}),i.start_time,i.end_time?`〜${i.end_time}`:""]})]}),i.location&&e.jsx("div",{className:"db-meeting-meta",style:{marginTop:2},children:e.jsxs("span",{className:"db-meeting-meta-item",children:[e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 14 14",fill:"none",children:e.jsx("path",{d:"M7 1.75a3.5 3.5 0 0 0-3.5 3.5C3.5 8.75 7 12.25 7 12.25s3.5-3.5 3.5-7a3.5 3.5 0 0 0-3.5-3.5Zm0 4.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z",fill:"currentColor"})}),i.location]})}),!i.isUpcoming&&e.jsx("span",{className:"pill",style:{marginTop:6,fontSize:11},children:"完了"})]}):e.jsx("p",{className:"db-sub-text",children:"予定されている幹事会はありません"})})]}),b||f||u?e.jsx("div",{className:"db-tier2",children:e.jsx(E,{lines:2})}):e.jsx("div",{className:"db-tier2",children:e.jsx(R,{title:"要対応",loading:!1,error:x,delay:150,children:e.jsxs("div",{className:"db-action-list",children:[e.jsxs(C,{to:"/admin/applications",className:"db-action-item",style:y>0?{background:"var(--error-light)"}:void 0,children:[e.jsxs("div",{className:"db-action-left",children:[e.jsx(W,{color:y>0?"var(--error)":"var(--success)"}),e.jsx("span",{children:"入会申込"})]}),y>0?e.jsxs("span",{className:"db-action-badge db-action-badge-alert",children:[y,"件 未処理"]}):e.jsx("span",{className:"db-action-badge db-action-badge-ok",children:"未処理なし"})]}),e.jsxs(C,{to:"/admin/dues-management",className:"db-action-item",style:k>0?{background:"var(--warning-light)"}:void 0,children:[e.jsxs("div",{className:"db-action-left",children:[e.jsx(W,{color:k>0?"var(--warning)":"var(--success)"}),e.jsx("span",{children:"会費未納"})]}),k>0?e.jsxs("span",{className:"db-action-badge db-action-badge-warn",children:[k,"件"]}):e.jsx("span",{className:"db-action-badge db-action-badge-ok",children:"未納なし"})]})]})})}),e.jsx("div",{className:"db-tier3",children:e.jsxs("div",{className:"db-card db-fade-in",style:{animationDelay:"200ms"},children:[e.jsx("div",{className:"db-card-header",children:e.jsx("span",{className:"db-card-title",children:"クイックアクション"})}),e.jsxs("div",{className:"db-quick-grid",children:[e.jsxs(C,{className:"db-quick-btn",to:"/admin/members/new",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("path",{d:"M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"}),e.jsx("circle",{cx:"8.5",cy:"7",r:"4"}),e.jsx("line",{x1:"20",y1:"8",x2:"20",y2:"14"}),e.jsx("line",{x1:"23",y1:"11",x2:"17",y2:"11"})]}),"会員追加"]}),e.jsxs(C,{className:"db-quick-btn",to:"/admin/newsletters/new",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),e.jsx("polyline",{points:"22,6 12,13 2,6"})]}),"メルマガ作成"]}),e.jsxs(C,{className:"db-quick-btn",to:"/admin/meetings",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("rect",{x:"3",y:"4",width:"18",height:"18",rx:"2",ry:"2"}),e.jsx("line",{x1:"16",y1:"2",x2:"16",y2:"6"}),e.jsx("line",{x1:"8",y1:"2",x2:"8",y2:"6"}),e.jsx("line",{x1:"3",y1:"10",x2:"21",y2:"10"})]}),"幹事会管理"]})]})]})}),e.jsx("style",{children:`
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

        /* ── fade-in with stagger ── */
        .db-fade-in {
          animation: db-fadein 0.35s ease both;
        }
        @keyframes db-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── FY badge in header ── */
        .db-fy-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid var(--primary-100);
          white-space: nowrap;
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
          margin-bottom: 2px;
          flex-wrap: wrap;
        }
        .db-meeting-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
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
          padding: 12px 16px;
          border-radius: var(--radius);
          border: 1px solid var(--line);
          text-decoration: none;
          color: var(--text);
          font-size: 14px;
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
          padding: 3px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }
        .db-action-badge-alert {
          background: var(--error);
          color: #fff;
        }
        .db-action-badge-warn {
          background: var(--warning);
          color: #fff;
        }
        .db-action-badge-ok {
          background: var(--line-light);
          color: var(--text-secondary);
          font-weight: 500;
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
            margin-bottom: 12px;
          }
          .db-quick-grid {
            grid-template-columns: repeat(3, 1fr);
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
            gap: 6px;
          }
          .db-action-item {
            padding: 10px 12px;
            font-size: 13px;
          }
          .db-fy-badge {
            font-size: 12px;
            padding: 3px 10px;
          }
        }
      `})]})}export{Z as default};
