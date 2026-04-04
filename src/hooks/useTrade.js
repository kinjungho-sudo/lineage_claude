import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GAME_ACTIONS } from '../constants/gameActions';

export const useTrade = (state, dispatch) => {
    const [tradeState, setTradeState] = useState(null);
    const [incomingRequest, setIncomingRequest] = useState(null);
    const channelRef = useRef(null);
    const myNameRef = useRef(state.characterName);

    useEffect(() => {
        myNameRef.current = state.characterName;
    }, [state.characterName]);

    useEffect(() => {
        const myName = state.characterName;
        if (!myName || supabase?.isOffline) return;

        const channel = supabase.channel('trade_global', {
            config: { broadcast: { self: false } },
        });

        channel
            .on('broadcast', { event: 'trade_request' }, ({ payload }) => {
                if (payload.to !== myNameRef.current) return;
                setIncomingRequest({ from: payload.from });
            })
            .on('broadcast', { event: 'trade_accept' }, ({ payload }) => {
                if (payload.to !== myNameRef.current) return;
                setTradeState({
                    status: 'open',
                    partner: payload.from,
                    myOffer: { items: [], adena: 0 },
                    partnerOffer: { items: [], adena: 0 },
                    myConfirmed: false,
                    partnerConfirmed: false,
                });
            })
            .on('broadcast', { event: 'trade_decline' }, ({ payload }) => {
                if (payload.to !== myNameRef.current) return;
                setTradeState(null);
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[거래] ${payload.from}님이 거래를 거절했습니다.` });
            })
            .on('broadcast', { event: 'trade_cancel' }, ({ payload }) => {
                if (payload.to !== myNameRef.current) return;
                setTradeState(null);
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[거래] ${payload.from}님이 거래를 취소했습니다.` });
            })
            .on('broadcast', { event: 'trade_update' }, ({ payload }) => {
                if (payload.to !== myNameRef.current) return;
                setTradeState(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        partnerOffer: { items: payload.items, adena: payload.adena },
                        myConfirmed: false,
                        partnerConfirmed: false,
                    };
                });
            })
            .on('broadcast', { event: 'trade_confirm' }, ({ payload }) => {
                if (payload.to !== myNameRef.current) return;
                setTradeState(prev => {
                    if (!prev) return prev;
                    const updated = { ...prev, partnerConfirmed: true };
                    if (updated.myConfirmed) {
                        dispatch({
                            type: GAME_ACTIONS.APPLY_TRADE,
                            payload: {
                                giveItems: updated.myOffer.items,
                                giveAdena: updated.myOffer.adena,
                                receiveItems: updated.partnerOffer.items,
                                receiveAdena: updated.partnerOffer.adena,
                            },
                        });
                        return null;
                    }
                    return updated;
                });
            })
            .on('broadcast', { event: 'trade_unconfirm' }, ({ payload }) => {
                if (payload.to !== myNameRef.current) return;
                setTradeState(prev => prev ? { ...prev, partnerConfirmed: false } : prev);
            })
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [state.characterName]); // eslint-disable-line react-hooks/exhaustive-deps

    const broadcast = useCallback((event, payload) => {
        channelRef.current?.send({ type: 'broadcast', event, payload });
    }, []);

    const sendTradeRequest = useCallback((targetName) => {
        broadcast('trade_request', { from: myNameRef.current, to: targetName });
        setTradeState({
            status: 'pending',
            partner: targetName,
            myOffer: { items: [], adena: 0 },
            partnerOffer: { items: [], adena: 0 },
            myConfirmed: false,
            partnerConfirmed: false,
        });
    }, [broadcast]);

    const acceptTrade = useCallback(() => {
        setIncomingRequest(prev => {
            if (!prev) return prev;
            broadcast('trade_accept', { from: myNameRef.current, to: prev.from });
            setTradeState({
                status: 'open',
                partner: prev.from,
                myOffer: { items: [], adena: 0 },
                partnerOffer: { items: [], adena: 0 },
                myConfirmed: false,
                partnerConfirmed: false,
            });
            return null;
        });
    }, [broadcast]);

    const declineTrade = useCallback(() => {
        setIncomingRequest(prev => {
            if (!prev) return prev;
            broadcast('trade_decline', { from: myNameRef.current, to: prev.from });
            return null;
        });
    }, [broadcast]);

    const cancelTrade = useCallback(() => {
        setTradeState(prev => {
            if (!prev) return prev;
            broadcast('trade_cancel', { from: myNameRef.current, to: prev.partner });
            return null;
        });
    }, [broadcast]);

    const updateMyOffer = useCallback((items, adena) => {
        setTradeState(prev => {
            if (!prev) return prev;
            if (prev.myConfirmed) {
                broadcast('trade_unconfirm', { from: myNameRef.current, to: prev.partner });
            }
            broadcast('trade_update', { from: myNameRef.current, to: prev.partner, items, adena });
            return { ...prev, myOffer: { items, adena }, myConfirmed: false };
        });
    }, [broadcast]);

    const confirmTrade = useCallback(() => {
        setTradeState(prev => {
            if (!prev) return prev;
            broadcast('trade_confirm', { from: myNameRef.current, to: prev.partner });
            const updated = { ...prev, myConfirmed: true };
            if (updated.partnerConfirmed) {
                dispatch({
                    type: GAME_ACTIONS.APPLY_TRADE,
                    payload: {
                        giveItems: updated.myOffer.items,
                        giveAdena: updated.myOffer.adena,
                        receiveItems: updated.partnerOffer.items,
                        receiveAdena: updated.partnerOffer.adena,
                    },
                });
                return null;
            }
            return updated;
        });
    }, [broadcast, dispatch]);

    return {
        tradeState,
        incomingRequest,
        sendTradeRequest,
        acceptTrade,
        declineTrade,
        cancelTrade,
        updateMyOffer,
        confirmTrade,
    };
};
