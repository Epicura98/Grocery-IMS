import React from 'react'
import { ShieldCheck, Key, CheckCircle2 } from 'lucide-react'
import AdminLayout from '../components/layout/AdminLayout'

const License = () => {


    return (
        <AdminLayout>
            <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gradient-to-br from-violet-50 to-fuchsia-100 p-6 overflow-y-auto">
                <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl border border-violet-100 p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    
                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="p-6 bg-violet-600 rounded-[2rem] shadow-2xl shadow-violet-200 mb-8 animate-bounce-slow">
                            <ShieldCheck className="h-12 w-12 text-white" />
                        </div>
                        
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4 italic">
                            Enterprise License
                        </h1>
                        <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.3em] mb-12">
                            Secure Digital Asset Verification
                        </p>
                        
                        <div className="w-full grid gap-6 mb-12">
                            <div className="p-6 bg-violet-50/50 rounded-3xl border border-violet-100 flex items-center justify-between group hover:border-violet-300 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                        <Key className="h-5 w-5 text-violet-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">License Status</p>
                                        <p className="text-sm font-black text-slate-900">CORE-IMS-892-X</p>
                                    </div>
                                </div>
                                <span className="px-4 py-1.5 bg-violet-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-violet-200">
                                    Active
                                </span>
                            </div>

                            <div className="p-6 bg-fuchsia-50/50 rounded-3xl border border-fuchsia-100 flex items-center justify-between group hover:border-fuchsia-300 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                        <CheckCircle2 className="h-5 w-5 text-fuchsia-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">Deployment Auth</p>
                                        <p className="text-sm font-black text-slate-900">Verified Professional</p>
                                    </div>
                                </div>
                                <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500 animate-pulse"></span>
                            </div>
                        </div>

                        {/* Copyright Notice */}
                        <div className="w-full p-6 bg-violet-50/50 rounded-3xl border border-violet-100 mb-8">
                            <div className="text-lg font-black text-slate-800 mb-3 italic">
                                © BOTIVATE SERVICES LLP
                            </div>
                            <p className="text-violet-600 text-[10px] leading-relaxed font-bold uppercase tracking-wider">
                                This software is developed exclusively by Botivate Services LLP for use by its clients.
                                Unauthorized use, distribution, or copying is strictly prohibited.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-4 w-full">
                            <a 
                                href="mailto:info@botivate.in" 
                                className="w-full py-5 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all text-center block"
                            >
                                Contact Support
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}

export default License