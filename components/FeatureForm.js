import {
  Button,
  Flex,
  Heading,
  SwitchField,
  Text,
  TextField,
  View,
} from "@aws-amplify/ui-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API, Storage } from "aws-amplify";
import React, { useEffect, useState } from "react";
import { v4 } from "uuid";
import { createFeature, updateFeature } from "../src/graphql/mutations";
import { sortByTime } from "../utils/sort";

function FeatureForm({ feature = null, setActiveFeature }) {
  const [id, setId] = useState(undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isReleased, setReleased] = useState(false);
  const [internalDoc, setInternalDoc] = useState("");
  const featuresQueryKey = ["features"];

  const queryClient = useQueryClient();

  const saveFeature = useMutation({
    mutationFn: handleSaveFeature,
    onMutate: async (newFeature) => {
      await queryClient.cancelQueries({ queryKey: featuresQueryKey });

      const previousFeatures = queryClient.getQueryData(featuresQueryKey);

      // queryClient.setQueryData(featuresQueryKey, (old) => [...old, newFeature]);
      const toUpdateIndex = previousFeatures.findIndex(
        (item) => item.id === newFeature.id
      );
      console.log("toUpdateIndex", toUpdateIndex);
      if (toUpdateIndex === -1) {
        // create new feature
        queryClient.setQueryData(featuresQueryKey, (old) => {
          return [...old, newFeature].sort(sortByTime);
        });
      } else {
        // update existing feature
        previousFeatures[toUpdateIndex] = newFeature;

        queryClient.setQueryData(featuresQueryKey, previousFeatures);
      }

      resetFormFields();
      return { previousFeatures };
    },
    onError: (err, newFeature, context) => {
      queryClient.setQueryData(featuresQueryKey, context.previousFeatures);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: featuresQueryKey });
      feature && setActiveFeature(undefined);
    },
  });

  useEffect(() => {
    if (feature) {
      setId(feature.id);
      setTitle(feature.title);
      setDescription(feature.description);
      setReleased(feature.released);
      setInternalDoc(feature.internalDoc);
    }
  }, [feature]);

  async function handleUploadDoc(e) {
    const file = e.target.files[0];
    const fileName = `${Date.now()}-${file.name}`;
    try {
      await Storage.put(fileName, file, {
        contentType: file.type,
      });
      setInternalDoc(fileName);
    } catch (error) {
      console.log("Error uploading file: ", error);
    }
  }

  async function handleRemoveDoc() {
    try {
      await Storage.remove(internalDoc);
      setInternalDoc("");
    } catch (error) {
      console.log("Error removing file: ", error);
    }
  }

  function resetFormFields() {
    setId(undefined);
    setTitle("");
    setDescription("");
    setReleased(false);
    setInternalDoc("");
  }

  function createNewFeature() {
    const newFeature = {
      id: id || v4(),
      title,
      description,
      released: isReleased,
      internalDoc: internalDoc,
    };

    return newFeature;
  }

  async function handleSaveFeature(newFeature) {
    console.log("feature", feature);
    await API.graphql({
      authMode: "AMAZON_COGNITO_USER_POOLS",
      query: feature ? updateFeature : createFeature,
      variables: {
        input: newFeature,
      },
    });
  }

  return (
    <View>
      <Heading marginBottom="medium" level={5}>
        {feature ? "Edit" : "New"} Feature
      </Heading>
      <Flex direction={"column"} basis={"max-content"}>
        <TextField
          value={title}
          label="Title"
          errorMessage="There is an error"
          name="title"
          onChange={(e) => setTitle(e.target.value)}
        />

        <TextField
          value={description}
          name="description"
          label="Description"
          errorMessage="There is an error"
          onChange={(e) => setDescription(e.target.value)}
        />

        <SwitchField
          isChecked={isReleased}
          isDisabled={false}
          label="Released?"
          labelPosition="start"
          onChange={() => setReleased(!isReleased)}
        />

        {feature && internalDoc ? (
          <div>
            <Text>Attachment:</Text>
            <Text fontWeight={"bold"}>
              {internalDoc}{" "}
              <Button size="small" onClick={handleRemoveDoc}>
                X
              </Button>
            </Text>
          </div>
        ) : (
          <div>
            <Text>Upload a file:</Text>
            <input type="file" onChange={handleUploadDoc} />
          </div>
        )}

        <Flex marginTop="large">
          <Button
            onClick={() => {
              setActiveFeature(undefined);
              resetFormFields();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              const newFeature = createNewFeature();
              saveFeature.mutate(newFeature);
            }}
          >
            Save
          </Button>
        </Flex>
      </Flex>
    </View>
  );
}

export default FeatureForm;
