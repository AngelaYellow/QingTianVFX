using System;
using MCPForUnity.Editor.Services;
using MCPForUnity.Editor.Services.Transport;
using UnityEditor;
using UnityEngine;

namespace QingTian.Editor
{
    [InitializeOnLoad]
    public static class McpBootstrap
    {
        static McpBootstrap()
        {
            if (!Application.isBatchMode) EditorApplication.delayCall += Connect;
        }

        [MenuItem("QingTian/Connect MCP")]
        public static async void Connect()
        {
            if (EditorApplication.isCompiling || EditorApplication.isUpdating)
            { EditorApplication.delayCall += Connect; return; }
            try
            {
                var manager = MCPServiceLocator.TransportManager;
                if (!manager.IsRunning(TransportMode.Http))
                    Debug.Log("[QingTian] MCP connection: " + await manager.StartAsync(TransportMode.Http));
            }
            catch (Exception error) { Debug.LogWarning("[QingTian] MCP: " + error.Message); }
        }
    }
}
