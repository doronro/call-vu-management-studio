import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Pages from "@/pages/index.jsx"
import FormChat from "@/pages/FormChat.jsx"
import Dashboard from "@/pages/Dashboard.jsx"
import Analytics from "@/pages/Analytics.jsx"
import ProcessDetail from "@/pages/ProcessDetail.jsx"
import ProcessAnalytics from "@/pages/ProcessAnalytics.jsx"
import ProcessRunner from "@/pages/ProcessRunner.jsx"
import FormToChat from "@/pages/FormToChat.jsx"
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Pages />} />
        <Route path="/FormChat" element={<FormChat />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Analytics" element={<Analytics />} />
        <Route path="/ProcessDetail" element={<ProcessDetail />} />
        <Route path="/ProcessAnalytics" element={<ProcessAnalytics />} />
        <Route path="/ProcessRunner" element={<ProcessRunner />} />
        <Route path="/FormToChat" element={<FormToChat />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
