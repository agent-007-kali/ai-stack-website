'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCartStore, Feature } from '@/store/cart';
import { features, categories, industryStacks } from '@/lib/features';
import { ShoppingCart, X, Plus, Minus, Bot, ChevronDown, ChevronUp, Sparkles, Zap, ArrowRight, Check, MessageCircle, TrendingUp, Clock, Shield, Loader2 } from 'lucide-react';

export default function Home() {
  const { items, addItem, removeItem, getTotal, hasItem } = useCartStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: "Hi! I'm your AI consultant, powered by OpenClaw. Tell me about your business and I'll help you build the perfect AI stack. 💬" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);

  const filteredFeatures = activeCategory === 'all' 
    ? features 
    : features.filter(f => f.category === activeCategory);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionIdRef.current,
          context: {
            selectedFeatures: items.map(i => i.feature.id),
          }
        })
      });

      const data = await response.json();
      
      // Handle recommended features
      if (data.recommendedFeatures && data.recommendedFeatures.length > 0) {
        // Features were recommended - user might want to add them
      }
      
      setChatMessages(prev => [...prev, { role: 'ai', content: data.response || data.text || "I'm here to help! What else can I assist you with?" }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'ai', content: "Sorry, I'm having trouble connecting to my AI brain. Please try again!" }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, items]);

  // Quick suggestion handlers
  const handleQuickSuggestion = (suggestion: string) => {
    setChatInput(suggestion);
    setTimeout(() => handleChatSubmit(), 100);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-xl">AI Stack</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#build" className="text-sm text-gray-400 hover:text-white transition">Build Your Stack</a>
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition">Features</a>
            <a href="#demos" className="text-sm text-gray-400 hover:text-white transition">Live Demos</a>
            <a href="#stacks" className="text-sm text-gray-400 hover:text-white transition">Ready Stacks</a>
          </div>
          
          <button 
            onClick={() => setShowCheckout(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-medium hover:bg-gray-200 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            Cart
            {items.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-green-500 text-black text-xs flex items-center justify-center font-bold">
                {items.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <Bot className="w-4 h-4 text-green-400" />
            <span className="text-sm">Powered by AI Agents</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">Build Your AI Stack</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            Tell us what your business needs. Our AI builds your perfect stack. 
            Pay per feature. Live in 60 seconds.
          </p>
          
          {/* AI Chat Input */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Type what you need... (e.g., 'I need help with customer support')"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                className="w-full px-6 py-4 pr-32 rounded-2xl bg-white/5 border border-white/10 focus:border-green-500 focus:outline-none text-lg"
              />
              <button 
                onClick={handleChatSubmit}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 rounded-xl bg-green-500 text-black font-medium hover:bg-green-400 transition"
              >
                Ask AI
              </button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <button onClick={() => setChatInput("I'm a coffee shop owner")} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition">
                I'm a coffee shop owner
              </button>
              <button onClick={() => setChatInput("I need lead generation")} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition">
                I need lead generation
              </button>
              <button onClick={() => setChatInput("Automate my customer support")} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition">
                Automate support
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Tell Us', desc: 'Chat with our AI about your needs', icon: MessageCircle },
              { step: '2', title: 'Get Matched', desc: 'AI recommends the perfect modules', icon: Sparkles },
              { step: '3', title: 'Purchase', desc: 'Pay per feature, instant access', icon: Zap },
              { step: '4', title: 'Launch', desc: 'Your AI stack goes live in 60s', icon: RocketIcon }
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Build Your Stack */}
      <section id="build" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Build Your Stack</h2>
            <p className="text-gray-400">Select individual AI capabilities. Pay only for what you need.</p>
          </div>
          
          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeCategory === cat.id 
                    ? 'bg-green-500 text-black' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
          
          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFeatures.map((feature) => (
              <FeatureCard 
                key={feature.id} 
                feature={feature} 
                selected={hasItem(feature.id)}
                onToggle={() => hasItem(feature.id) ? removeItem(feature.id) : addItem(feature)}
              />
            ))}
          </div>
          
          {/* Cart Summary */}
          <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 p-4 z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <span className="text-gray-400">Your Stack:</span>
                <span className="ml-2 font-bold">{items.length} features</span>
                <span className="ml-4 text-2xl font-bold text-green-400">${getTotal()}/mo</span>
              </div>
              <button 
                onClick={() => setShowCheckout(true)}
                className="px-8 py-3 rounded-full bg-green-500 text-black font-bold hover:bg-green-400 transition flex items-center gap-2"
              >
                Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="h-24"></div>
        </div>
      </section>

      {/* Live Demos */}
      <section id="demos" className="py-20 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Watch It Work</h2>
          <p className="text-gray-400 text-center mb-12">See each feature in action before you buy</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {features.slice(0, 3).map((feature) => (
              <DemoCard 
                key={feature.id} 
                feature={feature}
                expanded={selectedDemo === feature.id}
                onToggle={() => setSelectedDemo(selectedDemo === feature.id ? null : feature.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Ready-Made Stacks */}
      <section id="stacks" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Ready-Made Stacks</h2>
          <p className="text-gray-400 text-center mb-12">Pre-configured bundles for common use cases</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {industryStacks.map((stack) => (
              <div key={stack.id} className="p-6 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-white/20 hover:border-green-500/50 transition">
                <div className="text-3xl mb-3">
                  {stack.id === 'fitness' && '🏋️'}
                  {stack.id === 'ecommerce' && '🛒'}
                  {stack.id === 'consultant' && '👨‍💼'}
                  {stack.id === 'saas' && '🚀'}
                </div>
                <h3 className="font-bold text-lg mb-1">{stack.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{stack.description}</p>
                
                <div className="space-y-2 mb-6">
                  {stack.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">${stack.price}<span className="text-sm text-gray-400">/mo</span></span>
                  <button className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200 transition">
                    Add Stack
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Why AI Stack?</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Clock, title: '60s Setup', desc: 'Deploy instantly' },
              { icon: Shield, title: 'No Risk', desc: 'Cancel anytime' },
              { icon: TrendingUp, title: 'Scale Up', desc: 'Add features as you grow' },
              { icon: Sparkles, title: 'AI-Powered', desc: 'Always learning' }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <item.icon className="w-12 h-12 mx-auto mb-4 text-green-400" />
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold text-xl">AI Stack</span>
            </div>
            
            <div className="flex gap-8 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition">Documentation</a>
              <a href="#" className="hover:text-white transition">API</a>
              <a href="#" className="hover:text-white transition">Status</a>
              <a href="#" className="hover:text-white transition">Contact</a>
            </div>
          </div>
          
          <div className="text-center mt-8 text-gray-500 text-sm">
            © 2026 AI Stack Agency. Built with AI agents.
          </div>
        </div>
      </footer>

      {/* Floating Chat Widget */}
      <button 
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-green-500 text-black flex items-center justify-center shadow-lg hover:scale-110 transition z-50"
      >
        {chatOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </button>

      {chatOpen && (
        <div className="fixed bottom-36 right-4 w-96 max-w-[calc(100vw-32px)] h-[500px] rounded-2xl bg-gray-900 border border-white/20 shadow-2xl flex flex-col z-50">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-black" />
              </div>
              <div>
                <h4 className="font-bold">AI Consultant</h4>
                <p className="text-xs text-green-400">Online</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-green-500 text-black' 
                    : 'bg-white/10'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                className="flex-1 px-4 py-2 rounded-full bg-white/10 border border-white/10 focus:outline-none focus:border-green-500 text-sm"
              />
              <button 
                onClick={handleChatSubmit}
                className="w-10 h-10 rounded-full bg-green-500 text-black flex items-center justify-center hover:bg-green-400 transition"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal 
          items={items} 
          total={getTotal()} 
          onClose={() => setShowCheckout(false)}
          onRemove={removeItem}
        />
      )}
    </div>
  );
}

function FeatureCard({ feature, selected, onToggle }: { feature: Feature; selected: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className={`p-6 rounded-2xl border transition ${
      selected 
        ? 'bg-green-500/10 border-green-500' 
        : 'bg-white/5 border-white/10 hover:border-white/20'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{feature.icon}</span>
          <div>
            <h3 className="font-bold">{feature.name}</h3>
            <p className="text-2xl font-bold text-green-400">${feature.price}<span className="text-sm text-gray-400">/mo</span></p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
            selected 
              ? 'bg-green-500 text-black' 
              : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          {selected ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </div>
      
      <p className="text-gray-400 text-sm mb-4">{feature.description}</p>
      
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300 transition"
      >
        {expanded ? 'Hide demo' : 'See demo'} {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {expanded && (
        <div className="mt-4 p-4 rounded-xl bg-black/50 font-mono text-sm">
          {feature.demo.map((line, i) => (
            <div key={i} className={`mb-2 ${line.includes('Bot:') || line.includes('AI:') ? 'text-green-400' : ''}`}>
              {line}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 flex flex-wrap gap-2">
        {feature.benefits.map((benefit, i) => (
          <span key={i} className="px-2 py-1 rounded-full bg-white/5 text-xs">{benefit}</span>
        ))}
      </div>
    </div>
  );
}

function DemoCard({ feature, expanded, onToggle }: { feature: Feature; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{feature.icon}</span>
          <div>
            <h3 className="font-bold">{feature.name}</h3>
            <p className="text-sm text-gray-400">${feature.price}/mo</p>
          </div>
        </div>
        
        <button 
          onClick={onToggle}
          className="w-full py-2 rounded-xl bg-white/10 text-sm font-medium hover:bg-white/20 transition"
        >
          {expanded ? 'Hide Demo' : 'Watch Demo'}
        </button>
        
        {expanded && (
          <div className="mt-4 p-4 rounded-xl bg-black/50 font-mono text-sm h-48 overflow-y-auto scrollbar-hide">
            {feature.demo.map((line, i) => (
              <div key={i} className={`mb-2 ${line.includes('Bot:') || line.includes('AI:') || line.includes('📱') || line.includes('📊') || line.includes('📝') ? 'text-green-400' : ''}`}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutModal({ items, total, onClose, onRemove }: { 
  items: { feature: Feature }[]; 
  total: number; 
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleCheckout = async () => {
    if (!email) return;
    setProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ featureId: i.feature.id })),
          email,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: window.location.href
        })
      });
      
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
        setProcessing(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to create checkout session. Please try again.');
      setProcessing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-white/20 overflow-hidden">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xl font-bold">Your Cart</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Your cart is empty</p>
              <p className="text-sm">Add some features to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.feature.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.feature.icon}</span>
                    <div>
                      <h4 className="font-medium">{item.feature.name}</h4>
                      <p className="text-sm text-gray-400">${item.feature.price}/mo</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemove(item.feature.id)}
                    className="p-2 hover:bg-white/10 rounded-full text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {items.length > 0 && (
          <div className="p-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-400">Monthly Total</span>
              <span className="text-2xl font-bold text-green-400">${total}/mo</span>
            </div>
            
            <div className="mb-4">
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 focus:border-green-500 focus:outline-none"
              />
            </div>
            
            <button
              onClick={handleCheckout}
              disabled={!email || processing}
              className="w-full py-4 rounded-xl bg-green-500 text-black font-bold hover:bg-green-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Redirecting to Stripe...</>
              ) : (
                <>Checkout with Stripe <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            
            {error && (
              <p className="text-center text-red-400 text-sm mt-2">{error}</p>
            )}
            
            <p className="text-center text-xs text-gray-500 mt-4">
              Secure checkout powered by Stripe. Cancel anytime.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RocketIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  );
}
