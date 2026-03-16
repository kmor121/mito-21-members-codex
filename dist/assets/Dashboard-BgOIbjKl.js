import{r as l,e as S,j as e,L as M}from"./index-Dnlf_KJZ.js";import{u as I}from"./useIsMobile-cvvjl56b.js";const _=new Map,P=3e4;function T(t){const r=_.get(t);if(r){if(Date.now()-r.ts>P){_.delete(t);return}return r}}function Y(t,r){_.set(t,{data:r,ts:Date.now(),promise:null})}function H(t){const r=_.get(t);return r!=null&&r.promise?r.promise:null}function O(t,r){const s=_.get(t);s?s.promise=r:_.set(t,{data:null,ts:0,promise:r})}async function G(t,{signal:r,maxRetries:s=3,retryDelay:n=2e3}={}){let d;for(let c=0;c<=s;c++){if(r!=null&&r.aborted)throw new DOMException("Aborted","AbortError");try{return await t()}catch(a){d=a;const m=((a==null?void 0:a.message)||"").toLowerCase();if(!(m.includes("rate limit")||m.includes("429")||m.includes("too many"))||c===s)throw a;await new Promise((z,u)=>{const g=setTimeout(z,n*(c+1));r&&r.addEventListener("abort",()=>{clearTimeout(g),u(new DOMException("Aborted","AbortError"))},{once:!0})})}}throw d}function q(t,r,s={}){const{enabled:n=!0,deps:d=[]}=s,[c,a]=l.useState(()=>{const f=T(t);return f?f.data:null}),[m,h]=l.useState(()=>n&&!T(t)),[z,u]=l.useState(""),g=l.useRef(null),v=l.useRef(!0),y=l.useCallback(async(f=!1)=>{if(!n)return;if(!f){const i=T(t);if(i){a(i.data),h(!1),u("");return}}const b=H(t);if(b&&!f)try{const i=await b;v.current&&(a(i),h(!1),u(""));return}catch{}g.current&&g.current.abort();const k=new AbortController;g.current=k,h(!0),u("");const N=G(r,{signal:k.signal}).then(i=>(Y(t,i),v.current&&!k.signal.aborted&&(a(i),h(!1)),i)).catch(i=>{if((i==null?void 0:i.name)!=="AbortError"&&v.current){const o=((i==null?void 0:i.message)||"").toLowerCase(),j=o.includes("rate limit")||o.includes("429")||o.includes("too many");u(j?"リクエスト制限に達しました。しばらく待ってから再読み込みしてください。":(i==null?void 0:i.message)||"データの取得に失敗しました。"),h(!1)}});f||O(t,N)},[t,n,r]);l.useEffect(()=>(v.current=!0,y(),()=>{v.current=!1,g.current&&g.current.abort()}),[t,n,...d]);const F=l.useCallback(()=>y(!0),[y]);return{data:c,loading:m,error:z,refresh:F}}function A({width:t="100%",height:r=16,radius:s=6,style:n}){return e.jsx("div",{className:"db-skeleton",style:{width:t,height:r,borderRadius:s,...n}})}function R({lines:t=3}){return e.jsxs("div",{className:"db-card db-skeleton-card",children:[e.jsx(A,{width:"40%",height:14,style:{marginBottom:12}}),Array.from({length:t}).map((r,s)=>e.jsx(A,{width:s===t-1?"60%":"90%",height:12,style:{marginBottom:8}},s))]})}function W(t){return t>=80?"var(--success)":t>=50?"var(--warning)":"var(--error)"}function E({color:t}){return e.jsx("span",{style:{display:"inline-block",width:8,height:8,borderRadius:"50%",background:t,marginRight:6,flexShrink:0}})}function B({title:t,loading:r,error:s,children:n,linkTo:d,linkLabel:c,delay:a=0}){return e.jsxs("div",{className:`db-card${r?"":" db-fade-in"}`,style:a>0&&!r?{animationDelay:`${a}ms`}:void 0,children:[e.jsxs("div",{className:"db-card-header",children:[e.jsx("span",{className:"db-card-title",children:t}),d&&!r&&e.jsx(M,{className:"text-link",to:d,style:{fontSize:12},children:c||"詳細"})]}),e.jsx("div",{className:"db-card-body",children:s?e.jsx("p",{style:{color:"var(--error)",fontSize:13,margin:0},children:s}):n})]})}function V(t){if(!t)return"-";const r=typeof t=="string"?t.slice(0,10):"";if(!r)return"-";const[,s,n]=r.split("-"),d=new Date(r+"T00:00:00"),a=["日","月","火","水","木","金","土"][d.getDay()];return`${Number(s)}/${Number(n)}(${a})`}function U(){const t=I(),{data:r,loading:s,error:n}=q("dash:members:approved",()=>S.entities.Member.filter({approval_status:"承認済"})),{data:d,loading:c,error:a}=q("dash:members:pending",()=>S.entities.Member.filter({approval_status:"申請中"})),{data:m,loading:h,error:z}=q("dash:fy:all",()=>S.entities.FiscalYear.list()),{data:u,loading:g,error:v}=q("dash:dues:all",()=>S.entities.Due.list()),{data:y,loading:F,error:f}=q("dash:meetings:all",()=>S.entities.Meeting.list("-meeting_date",10)),b=l.useMemo(()=>m&&m.find(x=>x.is_current===!0)||null,[m]),k=b?b.year_label||(b.year?`${b.year}年度`:""):"",N=l.useMemo(()=>{if(!r)return null;const x=r;return{total:x.filter(p=>p.status==="活動中").length,regular:x.filter(p=>p.member_type==="正会員"&&p.status==="活動中").length,supporting:x.filter(p=>p.member_type==="賛助会員"&&p.status==="活動中").length}},[r]),i=l.useMemo(()=>{if(!m||!u)return null;if(!b)return{paid:0,total:0,unpaid:0,rate:0};const x=u.filter(L=>L.fiscal_year_id===b.id),p=x.filter(L=>L.status==="納入済").length,w=x.filter(L=>L.status==="未納").length,D=x.length,$=D>0?Math.round(p/D*100):0;return{paid:p,total:D,unpaid:w,rate:$}},[m,u,b]),o=l.useMemo(()=>{if(!y)return null;const x=new Date().toISOString().slice(0,10);return y.filter(w=>w.meeting_date>=x&&(w.status==="下書き"||w.status==="確定")).sort((w,D)=>w.meeting_date.localeCompare(D.meeting_date))[0]||null},[y]),j=(d==null?void 0:d.length)||0,C=(i==null?void 0:i.unpaid)||0;return e.jsxs("section",{className:"admin-shell",children:[e.jsxs("div",{className:"page-header",style:{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8},children:[e.jsxs("div",{children:[e.jsx("h1",{className:"page-title",style:{margin:0},children:"ダッシュボード"}),!t&&e.jsx("p",{className:"page-description",style:{margin:"2px 0 0"},children:"管理者ダッシュボード"})]}),k&&e.jsx("span",{style:{padding:"4px 14px",borderRadius:999,background:"var(--primary-light)",color:"var(--primary)",fontSize:12,fontWeight:700},children:k})]}),e.jsxs("div",{className:"db-tier1",children:[s?e.jsx(R,{lines:3}):e.jsx(B,{title:"会員概況",loading:!1,error:n,linkTo:"/admin/members",linkLabel:"会員一覧",delay:0,children:N&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"db-big-number",children:[N.total,e.jsx("span",{className:"db-big-unit",children:"名"})]}),e.jsxs("div",{className:"db-stat-grid",children:[e.jsxs("div",{className:"db-stat-row",children:[e.jsx(E,{color:"var(--primary)"}),"正会員",e.jsx("span",{className:"db-stat-val",children:N.regular})]}),e.jsxs("div",{className:"db-stat-row",children:[e.jsx(E,{color:"#8b5cf6"}),"賛助会員",e.jsx("span",{className:"db-stat-val",children:N.supporting})]})]})]})}),h||g?e.jsx(R,{lines:3}):e.jsx(B,{title:"会費回収状況",loading:!1,error:z||v,linkTo:"/admin/dues-management",linkLabel:"会費管理",delay:50,children:i&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"db-big-number",style:{color:W(i.rate)},children:[i.rate,e.jsx("span",{className:"db-big-unit",children:"%"})]}),e.jsx("div",{className:"db-progress-track",children:e.jsx("div",{className:"db-progress-fill",style:{width:`${i.rate}%`,background:W(i.rate)}})}),e.jsxs("p",{className:"db-sub-text",children:[i.paid," / ",i.total," 名が納入済 · 未納 ",i.unpaid,"件"]})]})}),F?e.jsx(R,{lines:3}):e.jsx(B,{title:"次回幹事会",loading:!1,error:f,linkTo:"/admin/meetings",linkLabel:"幹事会一覧",delay:100,children:o?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"db-meeting-date",children:V(o.meeting_date)}),o.start_time&&e.jsxs("div",{className:"db-meeting-time",children:[o.start_time,o.end_time?`〜${o.end_time}`:""]}),o.location&&e.jsx("p",{className:"db-sub-text",style:{marginTop:4},children:o.location}),o.title&&e.jsx("p",{className:"db-sub-text",style:{marginTop:2},children:o.title})]}):e.jsx("p",{className:"db-sub-text",children:"予定されている幹事会はありません"})})]}),c||h||g?e.jsx("div",{style:{marginBottom:16},children:e.jsx(R,{lines:2})}):e.jsx("div",{style:{marginBottom:16},children:e.jsx(B,{title:"要対応",loading:!1,error:a,delay:150,children:e.jsx("div",{className:"db-action-list",children:j===0&&C===0?e.jsxs("div",{className:"db-action-empty",children:[e.jsx(E,{color:"var(--success)"}),"未処理の項目はありません"]}):e.jsxs(e.Fragment,{children:[e.jsxs(M,{to:"/admin/applications",className:"db-action-item",style:j>0?{background:"var(--warning-light)"}:void 0,children:[e.jsxs("div",{className:"db-action-left",children:[e.jsx(E,{color:j>0?"var(--warning)":"var(--muted)"}),e.jsx("span",{children:"入会申請"})]}),e.jsxs("div",{className:"db-action-right",children:[e.jsxs("span",{className:"db-action-badge",style:j>0?{background:"var(--warning)",color:"#fff"}:void 0,children:[j,"件"]}),e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",children:e.jsx("path",{d:"M9 18l6-6-6-6"})})]})]}),e.jsxs(M,{to:"/admin/dues-management",className:"db-action-item",style:C>0?{background:"var(--error-light)"}:void 0,children:[e.jsxs("div",{className:"db-action-left",children:[e.jsx(E,{color:C>0?"var(--error)":"var(--muted)"}),e.jsx("span",{children:"未納会費"})]}),e.jsxs("div",{className:"db-action-right",children:[e.jsxs("span",{className:"db-action-badge",style:C>0?{background:"var(--error)",color:"#fff"}:void 0,children:[C,"件"]}),e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",children:e.jsx("path",{d:"M9 18l6-6-6-6"})})]})]})]})})})}),e.jsxs("div",{className:"db-card db-fade-in",style:{animationDelay:"200ms"},children:[e.jsx("div",{className:"db-card-header",children:e.jsx("span",{className:"db-card-title",children:"クイックアクション"})}),e.jsxs("div",{className:"db-quick-grid",children:[e.jsxs(M,{className:"db-quick-btn",to:"/admin/members/new",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("path",{d:"M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"}),e.jsx("circle",{cx:"8.5",cy:"7",r:"4"}),e.jsx("line",{x1:"20",y1:"8",x2:"20",y2:"14"}),e.jsx("line",{x1:"23",y1:"11",x2:"17",y2:"11"})]}),"会員追加"]}),e.jsxs(M,{className:"db-quick-btn",to:"/admin/newsletters/new",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("path",{d:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"}),e.jsx("polyline",{points:"22,6 12,13 2,6"})]}),"メルマガ作成"]}),e.jsxs(M,{className:"db-quick-btn",to:"/admin/meetings",children:[e.jsxs("svg",{width:"16",height:"16",fill:"none",stroke:"currentColor",strokeWidth:"2",viewBox:"0 0 24 24",children:[e.jsx("rect",{x:"3",y:"4",width:"18",height:"18",rx:"2",ry:"2"}),e.jsx("line",{x1:"16",y1:"2",x2:"16",y2:"6"}),e.jsx("line",{x1:"8",y1:"2",x2:"8",y2:"6"}),e.jsx("line",{x1:"3",y1:"10",x2:"21",y2:"10"})]}),"幹事会作成"]})]})]}),e.jsx("style",{children:`
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

        /* ── fade-in with stagger support ── */
        .db-fade-in {
          animation: db-fadein 0.35s ease both;
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

        /* ── tier layout ── */
        .db-tier1 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 16px;
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
        .db-meeting-date {
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .db-meeting-time {
          font-size: 14px;
          font-weight: 600;
          color: var(--primary);
          margin-bottom: 2px;
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
        .db-action-right {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
        }
        .db-action-badge {
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          background: var(--line-light);
          color: var(--text-secondary);
        }
        .db-action-empty {
          display: flex;
          align-items: center;
          font-size: 13px;
          color: var(--text-secondary);
          padding: 4px 0;
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
          .db-meeting-date {
            font-size: 18px;
          }
          .db-quick-btn {
            padding: 8px 10px;
            font-size: 12px;
            gap: 6px;
          }
        }
      `})]})}export{U as default};
