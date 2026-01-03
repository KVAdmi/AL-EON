-- =====================================================
-- FUNCIONES ÚTILES PARA MAIL SYSTEM
-- =====================================================

-- 1. Función para marcar mensaje como leído
CREATE OR REPLACE FUNCTION mark_message_as_read(message_uuid uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE public.mail_messages
  SET status = 'read', updated_at = now()
  WHERE id = message_uuid AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para marcar múltiples mensajes como leídos
CREATE OR REPLACE FUNCTION mark_messages_as_read(message_uuids uuid[])
RETURNS integer AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE public.mail_messages
  SET status = 'read', updated_at = now()
  WHERE id = ANY(message_uuids) AND user_id = auth.uid();
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para mover mensaje a carpeta
CREATE OR REPLACE FUNCTION move_message_to_folder(
  message_uuid uuid,
  target_folder text
)
RETURNS boolean AS $$
BEGIN
  UPDATE public.mail_messages
  SET folder = target_folder, updated_at = now()
  WHERE id = message_uuid AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para clasificar como spam
CREATE OR REPLACE FUNCTION mark_as_spam(
  message_uuid uuid,
  spam_reason_text text DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  UPDATE public.mail_messages
  SET 
    is_spam = true,
    spam_score = 10,
    spam_reason = spam_reason_text,
    folder = 'spam',
    updated_at = now()
  WHERE id = message_uuid AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para aplicar filtros automáticos a un mensaje
CREATE OR REPLACE FUNCTION apply_mail_filters(message_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  msg record;
  filter record;
  actions_applied jsonb DEFAULT '[]'::jsonb;
  condition_met boolean;
BEGIN
  -- Obtener el mensaje
  SELECT * INTO msg FROM public.mail_messages
  WHERE id = message_uuid AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Message not found');
  END IF;
  
  -- Iterar sobre filtros activos del usuario ordenados por prioridad
  FOR filter IN 
    SELECT * FROM public.mail_filters
    WHERE user_id = auth.uid() AND is_active = true
    ORDER BY priority DESC
  LOOP
    condition_met := true;
    
    -- Evaluar condiciones (simplificado, puedes expandir)
    IF filter.conditions ? 'from_contains' THEN
      IF msg.from_email NOT ILIKE '%' || (filter.conditions->>'from_contains') || '%' THEN
        condition_met := false;
      END IF;
    END IF;
    
    IF filter.conditions ? 'subject_contains' THEN
      IF msg.subject NOT ILIKE '%' || (filter.conditions->>'subject_contains') || '%' THEN
        condition_met := false;
      END IF;
    END IF;
    
    -- Si se cumplen las condiciones, aplicar acciones
    IF condition_met THEN
      -- Mover a carpeta
      IF filter.actions ? 'move_to' THEN
        UPDATE public.mail_messages
        SET folder = filter.actions->>'move_to'
        WHERE id = message_uuid;
        
        actions_applied := actions_applied || jsonb_build_object(
          'filter_id', filter.id,
          'action', 'moved_to',
          'value', filter.actions->>'move_to'
        );
      END IF;
      
      -- Marcar como leído
      IF (filter.actions->>'mark_as_read')::boolean THEN
        UPDATE public.mail_messages
        SET status = 'read'
        WHERE id = message_uuid;
        
        actions_applied := actions_applied || jsonb_build_object(
          'filter_id', filter.id,
          'action', 'marked_as_read'
        );
      END IF;
      
      -- Establecer bandera
      IF filter.actions ? 'set_flag' THEN
        UPDATE public.mail_messages
        SET flag = filter.actions->>'set_flag'
        WHERE id = message_uuid;
        
        actions_applied := actions_applied || jsonb_build_object(
          'filter_id', filter.id,
          'action', 'set_flag',
          'value', filter.actions->>'set_flag'
        );
      END IF;
      
      -- Marcar como spam
      IF (filter.actions->>'mark_as_spam')::boolean THEN
        UPDATE public.mail_messages
        SET is_spam = true, folder = 'spam'
        WHERE id = message_uuid;
        
        actions_applied := actions_applied || jsonb_build_object(
          'filter_id', filter.id,
          'action', 'marked_as_spam'
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'message_id', message_uuid,
    'actions_applied', actions_applied
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función para obtener estadísticas de correo del usuario
CREATE OR REPLACE FUNCTION get_mail_stats(account_uuid uuid DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  WITH stats AS (
    SELECT
      COUNT(*) as total_messages,
      COUNT(*) FILTER (WHERE status = 'new') as unread_count,
      COUNT(*) FILTER (WHERE is_starred = true) as starred_count,
      COUNT(*) FILTER (WHERE is_important = true) as important_count,
      COUNT(*) FILTER (WHERE is_spam = true) as spam_count,
      COUNT(*) FILTER (WHERE folder = 'inbox') as inbox_count,
      COUNT(*) FILTER (WHERE folder = 'sent') as sent_count,
      COUNT(*) FILTER (WHERE folder = 'drafts') as drafts_count,
      COUNT(*) FILTER (WHERE folder = 'trash') as trash_count,
      COUNT(*) FILTER (WHERE flag = 'urgent') as urgent_count,
      COUNT(*) FILTER (WHERE flag = 'important') as important_flag_count,
      COUNT(*) FILTER (WHERE flag = 'pending') as pending_count
    FROM public.mail_messages
    WHERE user_id = auth.uid()
      AND (account_uuid IS NULL OR account_id = account_uuid)
  )
  SELECT jsonb_build_object(
    'total_messages', total_messages,
    'unread_count', unread_count,
    'starred_count', starred_count,
    'important_count', important_count,
    'spam_count', spam_count,
    'inbox_count', inbox_count,
    'sent_count', sent_count,
    'drafts_count', drafts_count,
    'trash_count', trash_count,
    'urgent_count', urgent_count,
    'important_flag_count', important_flag_count,
    'pending_count', pending_count
  ) INTO result FROM stats;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para buscar correos (full text search simplificado)
CREATE OR REPLACE FUNCTION search_mail_messages(
  search_query text,
  folder_filter text DEFAULT NULL,
  limit_count integer DEFAULT 50
)
RETURNS SETOF public.mail_messages AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.mail_messages
  WHERE user_id = auth.uid()
    AND (
      from_email ILIKE '%' || search_query || '%'
      OR to_email ILIKE '%' || search_query || '%'
      OR subject ILIKE '%' || search_query || '%'
      OR snippet ILIKE '%' || search_query || '%'
    )
    AND (folder_filter IS NULL OR folder = folder_filter)
  ORDER BY received_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función para eliminar mensajes antiguos (limpieza)
CREATE OR REPLACE FUNCTION cleanup_old_messages(
  days_old integer DEFAULT 90,
  folder_to_clean text DEFAULT 'trash'
)
RETURNS integer AS $$
DECLARE
  rows_deleted integer;
BEGIN
  DELETE FROM public.mail_messages
  WHERE user_id = auth.uid()
    AND folder = folder_to_clean
    AND received_at < (now() - (days_old || ' days')::interval);
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Función para obtener thread/conversación completa
CREATE OR REPLACE FUNCTION get_mail_thread(thread_id_param text)
RETURNS SETOF public.mail_messages AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.mail_messages
  WHERE user_id = auth.uid()
    AND thread_id = thread_id_param
  ORDER BY received_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Función para log de sincronización
CREATE OR REPLACE FUNCTION log_mail_sync(
  account_uuid uuid,
  sync_type_param text,
  status_param text,
  messages_fetched_param integer DEFAULT 0,
  messages_new_param integer DEFAULT 0,
  messages_updated_param integer DEFAULT 0,
  errors_param text DEFAULT NULL,
  details_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
  started_time timestamp with time zone;
BEGIN
  -- Buscar el log iniciado más reciente para esta cuenta
  SELECT id, started_at INTO log_id, started_time
  FROM public.mail_sync_log
  WHERE account_id = account_uuid
    AND completed_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;
  
  IF log_id IS NOT NULL THEN
    -- Actualizar log existente
    UPDATE public.mail_sync_log
    SET
      status = status_param,
      messages_fetched = messages_fetched_param,
      messages_new = messages_new_param,
      messages_updated = messages_updated_param,
      errors = errors_param,
      details = details_param,
      completed_at = now(),
      duration_ms = EXTRACT(EPOCH FROM (now() - started_time)) * 1000
    WHERE id = log_id;
  ELSE
    -- Crear nuevo log
    INSERT INTO public.mail_sync_log (
      account_id,
      sync_type,
      status,
      messages_fetched,
      messages_new,
      messages_updated,
      errors,
      details
    ) VALUES (
      account_uuid,
      sync_type_param,
      status_param,
      messages_fetched_param,
      messages_new_param,
      messages_updated_param,
      errors_param,
      details_param
    )
    RETURNING id INTO log_id;
  END IF;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERMISOS PARA LAS FUNCIONES
-- =====================================================

-- Dar permiso de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION mark_message_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION move_message_to_folder TO authenticated;
GRANT EXECUTE ON FUNCTION mark_as_spam TO authenticated;
GRANT EXECUTE ON FUNCTION apply_mail_filters TO authenticated;
GRANT EXECUTE ON FUNCTION get_mail_stats TO authenticated;
GRANT EXECUTE ON FUNCTION search_mail_messages TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_mail_thread TO authenticated;
GRANT EXECUTE ON FUNCTION log_mail_sync TO authenticated;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*

-- Marcar mensaje como leído
SELECT mark_message_as_read('uuid-del-mensaje');

-- Obtener estadísticas
SELECT get_mail_stats();
SELECT get_mail_stats('uuid-de-cuenta-especifica');

-- Buscar correos
SELECT * FROM search_mail_messages('importante');
SELECT * FROM search_mail_messages('reunion', 'inbox');

-- Mover a carpeta
SELECT move_message_to_folder('uuid-del-mensaje', 'spam');

-- Clasificar como spam
SELECT mark_as_spam('uuid-del-mensaje', 'Detectado patrón sospechoso');

-- Aplicar filtros automáticos
SELECT apply_mail_filters('uuid-del-mensaje');

-- Obtener thread completo
SELECT * FROM get_mail_thread('thread-id-12345');

-- Limpiar mensajes antiguos
SELECT cleanup_old_messages(90, 'trash'); -- Elimina de papelera > 90 días

-- Log de sincronización
SELECT log_mail_sync(
  'uuid-de-cuenta',
  'auto',
  'success',
  50,  -- messages_fetched
  5,   -- messages_new
  2,   -- messages_updated
  NULL,
  '{"provider": "ses"}'::jsonb
);

*/
