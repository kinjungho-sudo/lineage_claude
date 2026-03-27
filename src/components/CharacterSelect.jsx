import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import { Shield, UserPlus, Play, User, Sword, Wand2, Target, LogOut } from 'lucide-react';

/**
 * Character Selection Screen
 * - Allows user to pick one of 3 character slots
 * - Supports creating new characters with name and class
 */
const CharacterSelect = () => {
    const { state, dispatch, logout, user, saveData } = useGame();
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedClass, setSelectedClass] = useState('knight');

    // [개선] 캐릭터 생성/삭제 발생 시 즉시 저장 강제 수행
    React.useEffect(() => {
        if (user && state.allCharacters) { // Check for existence of allCharacters
            saveData(user.id, state);
        }
    }, [state.allCharacters?.length, user, saveData, state]); // Depend on length for changes, and other necessary deps

    const characters = state.allCharacters || [];

    const handleSelect = (charId) => {
        dispatch({ type: GAME_ACTIONS.SELECT_CHARACTER, payload: charId });
    };

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        if (characters.length >= 3) {
            alert('최대 3개까지 캐릭터를 생성할 수 있습니다.');
            return;
        }

        // 중복 이름 체크 (계정 내)
        if (characters.some(c => c.characterName === newName.trim())) {
            alert('이미 존재하는 캐릭터 이름입니다.');
            return;
        }

        // Name Regex (한글, 영문, 숫자 2~10자리)
        const nameRegex = /^[가-힣a-zA-Z0-9]{2,10}$/;
        if (!nameRegex.test(newName)) {
            alert('이름은 한글, 영문, 숫자 2~10자리로 입력해주세요.');
            return;
        }

        dispatch({
            type: GAME_ACTIONS.CREATE_CHARACTER,
            payload: { name: newName.trim(), class: selectedClass }
        });
        
        setNewName('');
        setIsCreating(false);
    };

    const getClassIcon = (cls) => {
        switch (cls) {
            case 'knight': return <Sword className="w-5 h-5" />;
            case 'elf': return <Target className="w-5 h-5" />;
            case 'wizard': return <Wand2 className="w-5 h-5" />;
            default: return <User className="w-5 h-5" />;
        }
    };

    const getClassName = (cls) => {
        switch (cls) {
            case 'knight': return '기사 (Knight)';
            case 'elf': return '요정 (Elf)';
            case 'wizard': return '마법사 (Wizard)';
            default: return 'Unknown';
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-serif select-none bg-[url('/assets/login_bg_v2.png')] bg-cover bg-center bg-no-repeat">
            {/* Header Area */}
            <div className="mb-12 flex flex-col items-center animate-fade-in">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#d4af37] to-[#8a6d3b] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tighter"
                    style={{ fontFamily: '"Cinzel", serif' }}>
                    SELECT CHARACTER
                </h1>
                <div className="h-[1px] w-64 bg-gradient-to-r from-transparent via-[#a59c77] to-transparent mt-2 opacity-50"></div>
                <p className="text-[#a59c77] text-[10px] tracking-[0.4em] mt-2 font-bold uppercase">Account: {user?.nickname || user?.id}</p>
            </div>

            {/* Character Slots Selection */}
            {!isCreating ? (
                <div className="w-full max-w-[900px] flex flex-wrap justify-center gap-6 animate-fade-in-up">
                    {[0, 1, 2].map(index => {
                        const char = characters[index];
                        return (
                            <div key={index} 
                                className={`w-[260px] h-[380px] bg-[#1a1a1a]/90 border-2 border-[#3f3f3f] relative group transition-all duration-300
                                ${char ? 'hover:border-[#d4af37] cursor-pointer' : 'border-dashed opacity-60 hover:opacity-100 cursor-default'}`}
                                onClick={() => char && handleSelect(char.id)}
                            >
                                {/* Decorative Border */}
                                <div className="absolute inset-1 border border-[#2a2a2a]"></div>

                                {char ? (
                                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-between z-10">
                                        <div className="flex flex-col items-center gap-4 mt-4">
                                            <div className="w-20 h-20 bg-gradient-to-b from-[#333] to-[#111] border border-[#a59c77]/30 rounded-full flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                <div className="text-[#d4af37]">
                                                    {getClassIcon(char.characterClass)}
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-2xl font-bold text-[#efefef] tracking-wider mb-1 group-hover:text-[#d4af37] transition-colors">{char.characterName}</h3>
                                                <p className="text-[#a59c77] text-xs font-bold uppercase tracking-widest opacity-80">{getClassName(char.characterClass)}</p>
                                            </div>
                                        </div>

                                        <div className="w-full space-y-2 mb-4">
                                            <div className="flex justify-between text-[11px] font-bold tracking-widest text-[#a59c77]">
                                                <span>LEVEL</span>
                                                <span className="text-[#efefef]">{char.level || 1}</span>
                                            </div>
                                            <div className="h-[2px] w-full bg-[#333] overflow-hidden">
                                                <div className="h-full bg-[#d4af37]" style={{ width: '45%' }}></div>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-bold tracking-widest text-[#a59c77]">
                                                <span>ADENA</span>
                                                <span className="text-[#efefef]">{(char.adena || 0).toLocaleString()} A</span>
                                            </div>
                                        </div>

                                        <button className="w-full py-3 bg-[#2a2a2a] border border-[#3f3f3f] text-[#d4af37] font-bold tracking-[0.3em] hover:bg-[#d4af37] hover:text-black transition-all group-hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                                            SELECT
                                        </button>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 group-hover:scale-105 transition-transform">
                                        <UserPlus className="w-12 h-12 text-[#444] group-hover:text-[#a59c77] transition-colors" />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsCreating(true); }}
                                            className="px-6 py-2 border border-[#3f3f3f] text-[#666] text-xs font-bold tracking-[0.2em] hover:bg-[#a59c77] hover:text-black hover:border-transparent transition-all"
                                        >
                                            CREATE CHARACTER
                                        </button>
                                    </div>
                                )}
                                
                                {/* Slot Number */}
                                <div className="absolute top-2 left-2 text-[9px] font-bold text-[#444] px-1.5 py-0.5 border border-[#444]">
                                    SLOT {index + 1}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Create Character Form */
                <div className="w-full max-w-[400px] bg-[#1a1a1a] border-2 border-[#d4af37] p-1 shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-scale-in">
                    <div className="border border-[#2a2a2a] p-8 flex flex-col gap-6 relative">
                        <div className="text-center text-[#d4af37] font-bold tracking-[0.4em] text-lg">NEW CHARACTER</div>
                        
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[#a59c77] text-xs font-bold tracking-widest pl-1">NAME</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    autoFocus
                                    className="w-full bg-black border border-[#3f3f3f] text-[#efefef] px-4 py-3 focus:border-[#d4af37] outline-none font-mono tracking-wider transition-colors text-center"
                                    placeholder="별명 입력 (2~10자)"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[#a59c77] text-xs font-bold tracking-widest pl-1">CLASS</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'knight', icon: <Sword />, label: 'KNIGHT' },
                                        { id: 'elf', icon: <Target />, label: 'ELF' }
                                    ].map(cls => (
                                        <button
                                            key={cls.id}
                                            type="button"
                                            onClick={() => setSelectedClass(cls.id)}
                                            className={`flex flex-col items-center gap-2 p-3 border transition-all ${selectedClass === cls.id ? 'bg-[#d4af37]/10 border-[#d4af37] text-[#d4af37]' : 'border-[#3f3f3f] text-[#444] hover:border-[#666]'}`}
                                        >
                                            <div className={selectedClass === cls.id ? 'scale-110' : 'scale-100'}>{cls.icon}</div>
                                            <span className="text-[9px] font-bold tracking-tighter">{cls.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-3 bg-transparent border border-[#333] text-[#666] text-xs font-bold tracking-widest hover:text-[#efefef] transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newName.trim()}
                                    className={`flex-1 py-3 bg-[#2a2a2a] border border-[#d4af37] text-[#d4af37] text-xs font-bold tracking-widest hover:bg-[#d4af37] hover:text-black transition-all ${!newName.trim() ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                    CREATE
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Logout / Switch Account */}
            <button 
                onClick={() => logout()}
                className="mt-12 group flex items-center gap-2 text-[#444] hover:text-[#a59c77] transition-all"
            >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-bold tracking-[0.2em]">SWITCH ACCOUNT</span>
            </button>

            {/* Footer */}
            <div className="mt-12 text-center opacity-40">
                <p className="text-[#333] text-[9px] tracking-widest uppercase">Select your path, forge your legacy</p>
            </div>
        </div>
    );
};

export default CharacterSelect;
