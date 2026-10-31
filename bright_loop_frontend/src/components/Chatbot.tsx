import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  ChevronDown,
  HelpCircle,
  CreditCard,
  Repeat,
  Receipt,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  suggestions?: string[];
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am your EZbill Instant Assistant. I can give you quick, direct answers about plans, billing, invoices, upgrades, and account features without any delay.',
      time: 'Just now',
      suggestions: [
        'What plans are available?',
        'How does billing work?',
        'How do upgrades & proration work?',
        'What payment methods can I use?',
        'How do I cancel a subscription?',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  // Pre-compiled fast answers knowledge base
  const getInstantAnswer = (query: string): string => {
    const q = query.toLowerCase().trim();

    if (q.includes('plan') || q.includes('price') || q.includes('cost') || q.includes('tier')) {
      return (
        'EZbill offers 3 flexible plans:\n\n' +
        '• Starter ($99/mo): Up to 25 active clients, basic recurring billing & invoice generation.\n' +
        '• Professional ($299/mo): Up to 250 active clients, multi-rail payments, automated proration & discount rules.\n' +
        '• Enterprise ($899/mo): Unlimited clients, custom GST tax engines, reconciliation audits & dedicated SLA.\n\n' +
        'Tip: Annual billing gives an instant 20% discount!'
      );
    }

    if (q.includes('upgrade') || q.includes('downgrade') || q.includes('proration') || q.includes('change plan')) {
      return (
        'Plan changes are immediate and 100% prorated:\n\n' +
        '• Upgrades: You only pay the difference for the remaining days of your current billing period.\n' +
        '• Downgrades: Unused time on your previous plan is automatically converted into a credit balance applied to future invoices.\n\n' +
        'You can change plans anytime from the Customer Portal or Subscriptions tab.'
      );
    }

    if (q.includes('pay') || q.includes('payment') || q.includes('card') || q.includes('ach') || q.includes('wire') || q.includes('bank')) {
      return (
        'EZbill supports multi-rail payment methods:\n\n' +
        '• Credit & Debit Cards (Instant settlement)\n' +
        '• ACH Direct Debit (US Bank transfers)\n' +
        '• Wire Transfers (Swift / SEPA)\n' +
        '• Simulated Gateway for testing and sandbox validation\n\n' +
        'Instant printable bank receipts are generated for every settled payment.'
      );
    }

    if (q.includes('cancel') || q.includes('refund') || q.includes('pause')) {
      return (
        'Subscriptions can be canceled or paused with two options:\n\n' +
        '1. End-of-period: Keep full access until your current billing period ends without renewing.\n' +
        '2. Immediate: Terminate service right away with automated unused balance credit.\n\n' +
        'You can also pause subscriptions temporarily and resume them at any time.'
      );
    }

    if (q.includes('bill') || q.includes('invoice') || q.includes('receipt') || q.includes('cycle')) {
      return (
        'Recurring invoices are created automatically at the start of each billing cycle (Monthly, Quarterly, or Annual).\n\n' +
        '• Invoices carry sequential reference numbers (INV-2026-XXX).\n' +
        '• Tax lines itemize CGST, SGST, or IGST based on location.\n' +
        '• Clients can view and download invoices directly in the Customer Portal.'
      );
    }

    if (q.includes('tax') || q.includes('gst') || q.includes('cgst') || q.includes('sgst') || q.includes('igst')) {
      return (
        'EZbill includes an automated GST tax engine:\n\n' +
        '• Intra-state transactions: 9% CGST + 9% SGST (18% total)\n' +
        '• Inter-state transactions: 18% IGST\n\n' +
        'Taxes are computed automatically based on the customer address and invoice origin.'
      );
    }

    if (q.includes('quote') || q.includes('quotation') || q.includes('proposal')) {
      return (
        'The Quotations workflow lets sales teams create proposals with discounts and custom lines. Once the client approves the quote in their portal, it converts automatically into an active subscription and generates the initial invoice.'
      );
    }

    if (q.includes('login') || q.includes('sign in') || q.includes('account') || q.includes('role') || q.includes('register')) {
      return (
        'You can sign in using pre-configured verified personas (Admin, Finance Controller, Sales Director, Customer Client) or use the "Sign in as a new person" registration to create your own account instantly.'
      );
    }

    if (q.includes('contact') || q.includes('support') || q.includes('help') || q.includes('email') || q.includes('phone')) {
      return (
        'Need hands-on help? Reach our team:\n\n' +
        '• Email: support@ezbill.internal\n' +
        '• Live Help: Mon - Fri, 9am - 6pm EST\n' +
        '• Response Time: Under 15 minutes for enterprise tier.'
      );
    }

    if (q.includes('hi') || q.includes('hello') || q.includes('hey')) {
      return 'Hello! How can I assist you with EZbill today? Feel free to ask about plans, invoices, payments, or customer features!';
    }

    // Default clear answer
    return (
      `Here is what you need to know about "${query}":\n\n` +
      'EZbill is a subscription and recurring billing management platform that unifies customers, quotations, automated invoices, multi-rail payments, and revenue dashboards.\n\n' +
      'Would you like details on:\n' +
      '1. Subscription Plans & Pricing\n' +
      '2. Invoices & Billing cycles\n' +
      '3. Upgrades & Prorated credits\n' +
      '4. Payment methods supported'
    );
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      time: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Instant answer without page scraping or delay
    setTimeout(() => {
      const answer = getInstantAnswer(query);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: answer,
        time: 'Just now',
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 150);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: 'Chat cleared. How can I help you with EZbill?',
        time: 'Just now',
        suggestions: [
          'What plans are available?',
          'How does billing work?',
          'How do upgrades & proration work?',
          'What payment methods can I use?',
        ],
      },
    ]);
  };

  return (
    <aside
      aria-label="EZbill Instant Help Assistant"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '9999px',
            backgroundColor: '#0a0a0a',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            fontSize: '13.5px',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
          }}
          aria-label="Open Instant Answers Chatbot"
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Bot size={15} />
          </div>
          <span>Instant Answers</span>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
        </button>
      )}

      {/* Chat Window Popup */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            height: '520px',
            maxHeight: 'calc(100vh - 48px)',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid var(--border-soft)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 18px',
              backgroundColor: '#0a0a0a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>EZbill Assistant</span>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 600 }}>
                    READY
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)' }}>
                  Instant answers • No waiting
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={handleResetChat}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Reset conversation"
              >
                <RotateCcw size={14} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Minimize chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick topics bar */}
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid var(--border-soft)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
            }}
          >
            {[
              { label: 'Plans & Pricing', icon: Zap },
              { label: 'Upgrades', icon: Repeat },
              { label: 'Invoices', icon: Receipt },
              { label: 'Payments', icon: CreditCard },
              { label: 'GST Taxes', icon: ShieldCheck },
            ].map((topic) => {
              const Icon = topic.icon;
              return (
                <button
                  key={topic.label}
                  type="button"
                  onClick={() => handleSendMessage(topic.label)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-soft)',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--text)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <Icon size={11} color="var(--muted)" />
                  <span>{topic.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#fdfdfd',
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '86%',
                      padding: '10px 14px',
                      borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      backgroundColor: isUser ? '#0a0a0a' : '#f4f4f5',
                      color: isUser ? '#ffffff' : '#18181b',
                      fontSize: '13px',
                      lineHeight: 1.45,
                      whiteSpace: 'pre-line',
                      boxShadow: isUser ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {msg.text}
                  </div>

                  {/* Suggestion buttons if attached */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginTop: '6px',
                        width: '100%',
                      }}
                    >
                      {msg.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSendMessage(suggestion)}
                          style={{
                            textAlign: 'left',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            backgroundColor: '#ffffff',
                            border: '1px solid var(--border-soft)',
                            fontSize: '12px',
                            color: '#0a0a0a',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f4f4f5';
                            e.currentTarget.style.borderColor = '#d4d4d8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderColor = 'var(--border-soft)';
                          }}
                        >
                          <span>{suggestion}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '11px' }}>→</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: '10px', color: 'var(--muted)', padding: '0 4px' }}>
                    {msg.time}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '12px 14px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid var(--border-soft)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask a question (e.g. pricing, upgrades)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid var(--border-soft)',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fafafa',
                fontFamily: 'inherit',
                color: 'var(--text)',
              }}
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: inputText.trim() ? '#0a0a0a' : '#e4e4e7',
                color: '#ffffff',
                border: 'none',
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease',
                flexShrink: 0,
              }}
              title="Send question"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
