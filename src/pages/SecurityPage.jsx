import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';

export default function SecurityPage() {
  const { user, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      alert('❌ Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 8) {
      alert('❌ La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setChanging(true);
    
    try {
      // ✅ Cambiar contraseña con Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('[SecurityPage] Error al cambiar contraseña:', error);
        alert(`❌ Error: ${error.message}`);
        return;
      }

      console.log('[SecurityPage] ✅ Contraseña cambiada exitosamente');
      alert('✅ Contraseña actualizada correctamente');
      
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('[SecurityPage] Error inesperado:', err);
      alert(`❌ Error inesperado: ${err.message}`);
    } finally {
      setChanging(false);
    }
  }

  async function handleSignOut() {
    if (confirm('¿Cerrar sesión?')) {
      await signOut();
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🔐 Seguridad</h1>

      <div className="space-y-6">
        {/* Sesión Actual */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sesión Actual</h2>
          
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Usuario:</strong> {user?.email}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Estado:</strong> 🟢 Conectado
            </p>
          </div>

          <Button onClick={handleSignOut} variant="destructive" className="w-full">
            Cerrar Sesión
          </Button>
        </div>

        {/* Cambiar Contraseña */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Cambiar Contraseña</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nueva Contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirmar Contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="Repite la contraseña"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={changing || !newPassword || !confirmPassword}
              className="w-full"
            >
              {changing ? 'Cambiando...' : '🔑 Cambiar Contraseña'}
            </Button>
          </div>
        </div>

        {/* Sesiones Activas (placeholder) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sesiones Activas</h2>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <div>
                <p className="font-medium">🖥️ Esta sesión</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ahora</p>
              </div>
              <span className="text-green-600 font-medium">Activa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
