import {
  Button,
  Divider,
  Flex,
  Heading,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { Auth, withSSRContext } from "aws-amplify";
import Link from "next/link";
import React, { useState } from "react";
import FeatureForm from "../components/FeatureForm";
import FeaturesTable from "../components/FeaturesTable";
import { listFeatures } from "../src/graphql/queries";
import { sortByTime } from "../utils/sort";

export async function getServerSideProps({ req }) {
  const SSR = withSSRContext({ req });
  let initialFeatures = [];
  try {
    const response = await SSR.API.graphql({
      authMode: "AMAZON_COGNITO_USER_POOLS",
      query: listFeatures,
    });
    // initialFeatures = response.data.listFeatures.items.sort((a, b) => {
    //   if (a.createdAt < b.createdAt) return -1;
    //   if (a.createdAt > b.createdAt) return 1;
    //   return 0;
    // });
    initialFeatures = response.data.listFeatures.items.sort(sortByTime);
  } catch (error) {
    // console.log(error);
  }

  return {
    props: {
      initialFeatures,
    },
  };
}

function Admin({ initialFeatures }) {
  const [activeFeature, setActiveFeature] = useState(undefined);
  return (
    <View padding="2rem">
      <Flex justifyContent={"space-between"}>
        <Link href={"/admin"}>
          <Heading level={2}>AmpliCar Roadmap Admin</Heading>
        </Link>
        <Flex alignItems={"center"}>
          <Button type="button" onClick={() => Auth.signOut()}>
            Sign out
          </Button>
        </Flex>
      </Flex>
      <Divider marginTop={"medium"} marginBottom={"xxl"} />
      <Flex>
        <FeatureForm
          feature={activeFeature}
          setActiveFeature={setActiveFeature}
        />
        <FeaturesTable
          initialFeatures={initialFeatures}
          setActiveFeature={setActiveFeature}
        />
      </Flex>
    </View>
  );
}

export default withAuthenticator(Admin);
