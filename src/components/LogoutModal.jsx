import React from 'react';
import { Shield, User, LogOut } from 'lucide-react';

const LogoutModal = ({ isOpen, onClose, onLogoutToSelect, onLogout, isSaving }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="w-[320px] max-w-[90vw] bg-[#1a1a1a] border-2 border-[#d4af37] p-1 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
                <div className="border border-[#333] p-6 flex flex-col gap-6 text-center relative overflow-hidden">
                    {/* Decorative Background Icon */}
                    <Shield className="absolute -top-4 -right-4 w-24 h-24 text-[#d4af37]/5 rotate-12 pointer-events-none" />

                    <h2 className="text-[#d4af37] font-bold tracking-[0.3em] text-lg drop-shadow-lg">EXIT SYSTEM</h2>
                    <p className="text-gray-400 text-xs tracking-tighter">어떤 작업을 수행하시겠습니까?</p>

                    <div className="flex flex-col gap-2 relative z-10">
                        <button
                            onClick={onLogoutToSelect}
                            disabled={isSaving}
                            className="w-full py-3 bg-[#2a2a2a] border border-[#3f3f3f] text-[#efefef] text-[11px] font-bold hover:bg-[#333] hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-all active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            <User className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                            {isSaving ? '저장 중...' : '캐릭터 선택으로 나가기'}
                        </button>
                        <button
                            onClick={onLogout}
                            className="w-full py-3 bg-[#2a2a2a] border border-[#3f3f3f] text-[#efefef] text-[11px] font-bold hover:bg-[#333] hover:text-red-400 hover:border-red-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> 게임 종료 (로그아웃)
                        </button>
                        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#333] to-transparent my-1"></div>
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-gray-500 text-[10px] font-bold hover:text-gray-300 transition-colors uppercase tracking-[0.2em]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
