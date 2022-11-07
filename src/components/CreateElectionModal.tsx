import {
  Alert,
  AlertIcon,
  AlertTitle,
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  InputGroup,
  InputLeftAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { electionType, partylistType } from "../types/typings";
import { firestore } from "../firebase/firebase";
import { v4 as uuidv4 } from "uuid";
import Router from "next/router";
import { useSession } from "next-auth/react";
import reloadSession from "../utils/reloadSession";
import isElectionIdNameExists from "../utils/isElectionIdNameExists";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { setMinutes, setHours } from "date-fns";

const CreateElectionModal = ({
  isOpen,
  cantClose,
  onClose,
}: {
  isOpen: boolean;
  cantClose?: boolean;
  onClose: () => void;
}) => {
  const [election, setElection] = useState<electionType>({
    uid: "",
    id: uuidv4(),
    name: "",
    about: "",
    electionIdName: "",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    electionStartDate: Timestamp.now(),
    electionEndDate: Timestamp.now(),
    publicity: "private",
  });
  const initialPartylist: partylistType = {
    uid: "",
    id: uuidv4(),
    name: "Independent",
    abbreviation: "IND",
    logo: "",
    description: "",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{
    type: "electionIdName" | "electionDates";
    error: string;
  } | null>(null);
  const { data: session } = useSession();

  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    setElection({ ...election, name: "", electionIdName: "" });
    setStartDate(new Date());
    setEndDate(null);
    setError(null);
  }, [isOpen]);

  return (
    <Modal
      isOpen={cantClose ? true : isOpen}
      onClose={onClose}
      trapFocus={false}
    >
      <ModalOverlay />
      <ModalContent>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!startDate || !endDate) {
              setError({
                type: "electionDates",
                error: "Please select a start and end date for the election.",
              });
              return;
            }
            setError(null);
            setLoading(true);

            // Check if electionIdName is already taken
            if (await isElectionIdNameExists(election.electionIdName)) {
              setError({
                type: "electionIdName",
                error: "Election ID Name is already taken",
              });
              setLoading(false);
              return;
            }

            await addDoc(collection(firestore, "elections"), {
              ...election,
              name: election.name.trim(),
              electionIdName: election.electionIdName.trim(),
              electionStartDate: Timestamp.fromDate(startDate),
              electionEndDate: Timestamp.fromDate(endDate),
            }).then(async (electionSnap) => {
              session?.user &&
                (await updateDoc(doc(firestore, "admins", session.user.uid), {
                  elections: arrayUnion(electionSnap.id),
                }));
              await updateDoc(doc(firestore, "elections", electionSnap.id), {
                uid: electionSnap.id,
              });
              await addDoc(
                collection(
                  firestore,
                  "elections",
                  electionSnap.id,
                  "partylists"
                ),
                initialPartylist
              ).then((partylistSnap) => {
                updateDoc(
                  doc(
                    firestore,
                    "elections",
                    electionSnap.id,
                    "partylists",
                    partylistSnap.id
                  ),
                  {
                    uid: partylistSnap.id,
                  }
                );
              });
            });
            const electionIdName = election.electionIdName;
            setLoading(false);
            onClose();

            // reload session
            reloadSession();

            Router.push(`/${electionIdName}/dashboard`);
          }}
        >
          <ModalHeader>Create an election</ModalHeader>
          {!cantClose && <ModalCloseButton />}
          <ModalBody pb={6}>
            <FormControl isRequired>
              <FormLabel>Election Name</FormLabel>
              <Input
                placeholder="Election Name"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setElection({
                    ...election,
                    name: e.target.value,
                  });
                }}
                value={election.name}
              />
            </FormControl>

            <FormControl
              mt={4}
              isRequired
              isInvalid={error?.type === "electionIdName"}
            >
              <FormLabel>Election ID Name</FormLabel>
              <InputGroup>
                <InputLeftAddon>eboto-mo.com/</InputLeftAddon>
                <Input
                  placeholder="Election ID"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setElection({
                      ...election,
                      electionIdName: e.target.value.toLowerCase(),
                    });
                  }}
                  value={election.electionIdName}
                />
              </InputGroup>
              {error?.type === "electionIdName" && (
                <FormErrorMessage>{error.error}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl mt={4} isRequired>
              <FormLabel>Election Date</FormLabel>
              <DatePicker
                selected={startDate}
                minDate={new Date()}
                onChange={(date) => {
                  if (date) {
                    setStartDate(date);
                    setError(null);
                  } else {
                    setStartDate(null);
                    setEndDate(null);
                  }
                }}
                filterTime={(time) => {
                  const currentDate = new Date();
                  const selectedDate = new Date(time);

                  return currentDate.getTime() < selectedDate.getTime();
                }}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
                disabledKeyboardNavigation
                withPortal
                isClearable
                placeholderText="Select election start date"
              />
              <DatePicker
                disabled={!startDate}
                selected={endDate}
                onChange={(date) => {
                  setEndDate(date);
                  setError(null);
                }}
                minDate={startDate}
                filterTime={(time) => {
                  const selectedDate = new Date(time);

                  return startDate
                    ? startDate.getTime() < selectedDate.getTime()
                    : new Date().getTime() < selectedDate.getTime();
                }}
                showTimeSelect
                dateFormat="MMMM d, yyyy h:mm aa"
                disabledKeyboardNavigation
                withPortal
                isClearable
                placeholderText="Select election end date"
                highlightDates={startDate ? [startDate] : []}
              />
              <FormHelperText>
                You can&apos;t change the dates once the election is ongoing.
              </FormHelperText>
            </FormControl>
            {error?.type === "electionDates" && (
              <Alert status="error" marginTop={4}>
                <AlertIcon />
                <AlertTitle>{error?.error}</AlertTitle>
              </Alert>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              type="submit"
              mr={!cantClose ? 3 : 0}
              isLoading={loading}
            >
              Create
            </Button>
            {!cantClose && <Button onClick={onClose}>Cancel</Button>}
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default CreateElectionModal;