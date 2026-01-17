import{c as i,u as o,r as t,j as e}from"./index-e4e1323c.js";import{A as c}from"./arrow-right-ec1bb1bb.js";const d=i("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);function p(){const s=o(),[r,l]=t.useState(!1);return t.useEffect(()=>{l(!0)},[]),e.jsxs("div",{className:"min-h-screen bg-black text-white overflow-x-hidden relative flex flex-col",children:[e.jsx("div",{className:"absolute inset-0 overflow-hidden pointer-events-none",children:[...Array(30)].map((a,n)=>e.jsx("div",{className:"absolute w-1 h-1 rounded-full animate-float",style:{backgroundColor:"#2FA4C7",left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,animationDelay:`${Math.random()*5}s`,animationDuration:`${5+Math.random()*10}s`,opacity:Math.random()*.3+.1}},n))}),e.jsxs("div",{className:"relative z-10 flex-1 flex flex-col",children:[e.jsx("header",{className:"w-full px-6 sm:px-8 py-6 flex justify-end items-center",children:e.jsx("button",{onClick:()=>s("/login"),className:"px-6 py-2.5 rounded-full font-medium transition-all duration-300 hover:scale-105",style:{backgroundColor:"rgba(47, 164, 199, 0.1)",border:"1px solid rgba(47, 164, 199, 0.3)",color:"#2FA4C7"},children:"Iniciar Sesión"})}),e.jsx("div",{className:"flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20",children:e.jsxs("div",{className:`max-w-5xl mx-auto text-center transition-all duration-1000 transform ${r?"opacity-100 translate-y-0":"opacity-0 translate-y-10"}`,children:[e.jsx("div",{className:"mb-12 flex justify-center",children:e.jsxs("div",{className:"relative",children:[e.jsx("div",{className:"absolute inset-0 rounded-full blur-3xl opacity-40 animate-pulse-slow",style:{backgroundColor:"#2FA4C7"}}),e.jsx("img",{src:"/Logo AL-E sobre fondo negro.png",alt:"AL-EON",className:"relative h-64 sm:h-80 lg:h-96 object-contain animate-float"})]})}),e.jsxs("h1",{className:"text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 leading-tight",children:[e.jsx("span",{className:"bg-clip-text text-transparent",style:{backgroundImage:"linear-gradient(135deg, #2FA4C7 0%, #4FC3E0 100%)"},children:"Inteligencia Artificial"}),e.jsx("br",{}),e.jsx("span",{className:"text-white",children:"exclusiva de Infinity Kode"})]}),e.jsxs("p",{className:"text-lg sm:text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed",children:["Plataforma avanzada de IA diseñada para potenciar tu productividad.",e.jsx("br",{}),e.jsx("span",{style:{color:"#2FA4C7"},className:"font-semibold",children:"Análisis, creación y automatización al más alto nivel."})]}),e.jsxs("div",{className:"flex flex-col items-center gap-4",children:[e.jsxs("button",{onClick:()=>s("/login"),className:"group px-10 py-4 rounded-full font-semibold text-lg flex items-center gap-3 transition-all duration-300 hover:scale-105",style:{backgroundColor:"#2FA4C7",color:"white",boxShadow:"0 0 30px rgba(47, 164, 199, 0.3)"},onMouseEnter:a=>a.currentTarget.style.backgroundColor="#3DB5D6",onMouseLeave:a=>a.currentTarget.style.backgroundColor="#2FA4C7",children:["Acceder a la Plataforma",e.jsx(c,{className:"group-hover:translate-x-1 transition-transform",size:20})]}),e.jsxs("div",{className:"flex gap-4 text-sm text-gray-500",children:[e.jsx("a",{href:"/privacy",className:"hover:underline",style:{color:"#2FA4C7"},children:"Política de Privacidad"}),e.jsx("span",{className:"text-gray-600",children:"•"}),e.jsx("a",{href:"/terms",className:"hover:underline",style:{color:"#2FA4C7"},children:"Términos de Servicio"})]})]})]})}),e.jsx("footer",{className:"w-full px-6 sm:px-8 py-6 backdrop-blur-sm",style:{borderTop:"1px solid rgba(47, 164, 199, 0.2)"},children:e.jsx("div",{className:"max-w-6xl mx-auto text-center",children:e.jsxs("div",{className:"flex items-center justify-center gap-2 text-sm text-gray-400",children:[e.jsx(d,{size:16}),e.jsx("span",{children:"© 2025 AL-EON by Infinity Kode. Todos los derechos reservados."})]})})})]}),e.jsx("style",{jsx:!0,children:`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-40px) translateX(-10px);
          }
          75% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.8);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-float {
          animation: float ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle at center, var(--tw-gradient-stops));
        }
      `})]})}export{p as default};
