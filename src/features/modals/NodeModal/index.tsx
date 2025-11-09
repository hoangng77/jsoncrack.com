import React, { useState } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useFile from "../../../store/useFile";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const updateNode = useGraph(state => state.updateNode);
  const setContents = useFile(state => state.setContents);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(nodeData?.text ?? []);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedText(nodeData?.text ?? []);
  };

  const handleSave = () => {
    if (!nodeData) return;
  
    updateNode({ ...nodeData, text: editedText });
  
    const json = JSON.parse(useFile.getState().contents);
    const path = nodeData.path ?? [];
    let current = json;
  
    path.forEach((key, index) => {
      if (index === path.length - 1) {
        const updates = editedText.reduce((acc, row) => {
          if (row.key) {
            const existingValue = current[key]?.[row.key];
            if (typeof existingValue !== "object") {
              acc[row.key] = row.value;
            }
          }
          return acc;
        }, {} as Record<string, any>);
  
        current[key] = {
          ...current[key],
          ...updates,
        };
      } else {
        current = current[key];
      }
    });
  
    setContents({ contents: JSON.stringify(json, null, 2) });
    setIsEditing(false);
  };
  

  const handleCancel = () => {
    setIsEditing(false);
    setEditedText(nodeData?.text ?? []);
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="xs">
              {isEditing ? (
                <>
                  <button onClick={handleSave}>Save</button>
                  <button onClick={handleCancel}>Cancel</button>
                </>
              ) : (
                <button onClick={handleEdit}>Edit</button>
              )}
              <CloseButton onClick={onClose} />
            </Flex>
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {isEditing ? (
              <textarea
                value={JSON.stringify(editedText, null, 2)}
                onChange={e => setEditedText(JSON.parse(e.target.value))}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
